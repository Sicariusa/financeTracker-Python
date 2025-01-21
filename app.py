from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Length, Email, EqualTo, ValidationError
from sqlalchemy.orm import relationship
from datetime import datetime
import os
import secrets
from sqlalchemy import func, extract
from email_validator import validate_email, EmailNotValidError

app = Flask(__name__)
# Generate a secure random secret key
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    transactions = relationship('Transaction', back_populates='user')

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = relationship('User', back_populates='transactions')

class RegistrationForm(FlaskForm):
    username = StringField('Username', 
        validators=[DataRequired(), Length(min=2, max=20)])
    email = StringField('Email', 
        validators=[DataRequired(), Email()])
    password = PasswordField('Password', 
        validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', 
        validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Sign Up')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('That username is taken. Please choose a different one.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('That email is taken. Please choose a different one.')

class LoginForm(FlaskForm):
    email = StringField('Email', 
        validators=[DataRequired(), Email()])
    password = PasswordField('Password', 
        validators=[DataRequired()])
    submit = SubmitField('Login')

# Create database tables
with app.app_context():
    db.create_all()

@app.route("/register", methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        # Validate email format
        try:
            valid = validate_email(form.email.data)
            email = valid.email
        except EmailNotValidError:
            flash('Invalid email address.', 'danger')
            return render_template('register.html', title='Register', form=form)
        
        # Hash the password
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        
        # Create new user
        user = User(username=form.username.data, 
                    email=email, 
                    password=hashed_password)
        
        db.session.add(user)
        db.session.commit()
        
        flash(f'Account created for {form.username.data}! You can now log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html', title='Register', form=form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and bcrypt.check_password_hash(user.password, form.password.data):
            login_user(user)
            flash('Login successful!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Login unsuccessful. Please check email and password.', 'danger')
    
    return render_template('login.html', title='Login', form=form)

@app.route("/logout")
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET', 'POST'])
@login_required
def handle_transactions():
    if request.method == 'POST':
        data = request.json
        transaction = Transaction(
            type=data['type'],
            amount=float(data['amount']),
            category=data['category'],
            description=data.get('description', ''),
            date=datetime.strptime(data['date'], '%Y-%m-%d'),
            user_id=current_user.id
        )
        db.session.add(transaction)
        db.session.commit()
        return jsonify({'message': 'Transaction added successfully'})
    
    # Fetch only current user's transactions
    transactions = Transaction.query.filter_by(user_id=current_user.id)\
        .order_by(Transaction.date.desc()).all()
    return jsonify([{
        'id': t.id,
        'type': t.type,
        'amount': t.amount,
        'category': t.category,
        'description': t.description,
        'date': t.date.strftime('%Y-%m-%d')
    } for t in transactions])

@app.route('/api/analytics')
@login_required
def get_analytics():
    # Get total income and expenses for current user
    income = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'income', Transaction.user_id == current_user.id).scalar() or 0
    expenses = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'expense', Transaction.user_id == current_user.id).scalar() or 0
    
    # Get category-wise expenses for current user
    category_expenses = db.session.query(
        Transaction.category,
        db.func.sum(Transaction.amount)
    ).filter(Transaction.type == 'expense', Transaction.user_id == current_user.id)\
     .group_by(Transaction.category).all()
    
    return jsonify({
        'total_income': income,
        'total_expenses': expenses,
        'balance': income - expenses,
        'category_expenses': dict(category_expenses)
    })

@app.route('/api/analytics/monthly', methods=['GET'])
@login_required
def get_monthly_analytics():
    # Monthly income and expenses
    monthly_data = db.session.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total_amount'),
        Transaction.type
    ).filter(Transaction.user_id == current_user.id)\
     .group_by('year', 'month', Transaction.type)\
     .order_by('year', 'month')\
     .all()
    
    # Organize monthly data
    monthly_summary = {}
    for entry in monthly_data:
        key = f"{int(entry.year)}-{int(entry.month):02d}"
        if key not in monthly_summary:
            monthly_summary[key] = {'income': 0, 'expense': 0}
        
        monthly_summary[key][entry.type] = entry.total_amount
    
    return jsonify(monthly_summary)

@app.route('/api/analytics/trends', methods=['GET'])
@login_required
def get_financial_trends():
    # Trend analysis
    trends = {
        'avg_monthly_income': db.session.query(func.avg(Transaction.amount))\
            .filter(Transaction.type == 'income', Transaction.user_id == current_user.id).scalar() or 0,
        'avg_monthly_expense': db.session.query(func.avg(Transaction.amount))\
            .filter(Transaction.type == 'expense', Transaction.user_id == current_user.id).scalar() or 0,
        'top_expense_categories': dict(
            db.session.query(
                Transaction.category, 
                func.sum(Transaction.amount)
            ).filter(Transaction.type == 'expense', Transaction.user_id == current_user.id)\
             .group_by(Transaction.category)\
             .order_by(func.sum(Transaction.amount).desc())\
             .limit(5).all()
        ),
        'income_expense_ratio': None
    }
    
    # Calculate income-expense ratio
    total_income = db.session.query(func.sum(Transaction.amount))\
        .filter(Transaction.type == 'income', Transaction.user_id == current_user.id).scalar() or 1
    total_expense = db.session.query(func.sum(Transaction.amount))\
        .filter(Transaction.type == 'expense', Transaction.user_id == current_user.id).scalar() or 0
    
    trends['income_expense_ratio'] = total_income / (total_expense or 1)
    
    return jsonify(trends)

@app.route('/api/analytics/cashflow', methods=['GET'])
@login_required
def get_cashflow_analysis():
    # Cumulative cashflow over time
    transactions = Transaction.query.filter_by(user_id=current_user.id)\
        .order_by(Transaction.date).all()
    
    cashflow = []
    cumulative_balance = 0
    
    for transaction in transactions:
        amount = transaction.amount if transaction.type == 'income' else -transaction.amount
        cumulative_balance += amount
        
        cashflow.append({
            'date': transaction.date.strftime('%Y-%m-%d'),
            'type': transaction.type,
            'amount': transaction.amount,
            'cumulative_balance': cumulative_balance
        })
    
    return jsonify(cashflow)

if __name__ == '__main__':
    app.run(debug=True)
