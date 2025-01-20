

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from sqlalchemy.orm import relationship
from datetime import datetime
import os
import secrets
from sqlalchemy import func, extract
from email_validator import validate_email, EmailNotValidError


# In backend/app.py
from flask_cors import CORS
# app = Flask(__name__)
# CORS(app, supports_credentials=True)  # Enable CORS for all routes
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000"], "supports_credentials": True}})

# Generate a secure random secret key
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.session_protection = "strong"

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

# Create database tables
with app.app_context():
    db.create_all()

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    try:
        # Validate email
        valid = validate_email(data['email'])
        email = valid.email
    except EmailNotValidError:
        return jsonify({'error': 'Invalid email address'}), 400

    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Email already registered'}), 400

    # Hash password
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    
    # Create new user
    new_user = User(
        username=data['username'], 
        email=email, 
        password=hashed_password
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data['email']).first()
    
    if user and bcrypt.check_password_hash(user.password, data['password']):
        login_user(user)
        return jsonify({
            'id': user.id,
            'username': user.username,
            'email': user.email
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/current_user')
@login_required
def get_current_user():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email
    }), 200

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
        return jsonify({'message': 'Transaction added successfully'}), 201
    
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
    } for t in transactions]), 200

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
    }), 200

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
    
    return jsonify(monthly_summary), 200

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
    
    return jsonify(trends), 200

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
    
    return jsonify(cashflow), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
