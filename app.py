from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from sqlalchemy import func, extract

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
db = SQLAlchemy(app)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET', 'POST'])
def handle_transactions():
    if request.method == 'POST':
        data = request.json
        transaction = Transaction(
            type=data['type'],
            amount=float(data['amount']),
            category=data['category'],
            description=data.get('description', ''),
            date=datetime.strptime(data['date'], '%Y-%m-%d')
        )
        db.session.add(transaction)
        db.session.commit()
        return jsonify({'message': 'Transaction added successfully'})
    
    transactions = Transaction.query.order_by(Transaction.date.desc()).all()
    return jsonify([{
        'id': t.id,
        'type': t.type,
        'amount': t.amount,
        'category': t.category,
        'description': t.description,
        'date': t.date.strftime('%Y-%m-%d')
    } for t in transactions])

@app.route('/api/analytics')
def get_analytics():
    # Get total income and expenses
    income = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'income').scalar() or 0
    expenses = db.session.query(db.func.sum(Transaction.amount))\
        .filter(Transaction.type == 'expense').scalar() or 0
    
    # Get category-wise expenses
    category_expenses = db.session.query(
        Transaction.category,
        db.func.sum(Transaction.amount)
    ).filter(Transaction.type == 'expense')\
     .group_by(Transaction.category).all()
    
    return jsonify({
        'total_income': income,
        'total_expenses': expenses,
        'balance': income - expenses,
        'category_expenses': dict(category_expenses)
    })

@app.route('/api/analytics/monthly', methods=['GET'])
def get_monthly_analytics():
    # Monthly income and expenses
    monthly_data = db.session.query(
        extract('year', Transaction.date).label('year'),
        extract('month', Transaction.date).label('month'),
        func.sum(Transaction.amount).label('total_amount'),
        Transaction.type
    ).group_by('year', 'month', Transaction.type)\
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
def get_financial_trends():
    # Trend analysis
    trends = {
        'avg_monthly_income': db.session.query(func.avg(Transaction.amount))\
            .filter(Transaction.type == 'income').scalar() or 0,
        'avg_monthly_expense': db.session.query(func.avg(Transaction.amount))\
            .filter(Transaction.type == 'expense').scalar() or 0,
        'top_expense_categories': dict(
            db.session.query(
                Transaction.category, 
                func.sum(Transaction.amount)
            ).filter(Transaction.type == 'expense')\
             .group_by(Transaction.category)\
             .order_by(func.sum(Transaction.amount).desc())\
             .limit(5).all()
        ),
        'income_expense_ratio': None
    }
    
    # Calculate income-expense ratio
    total_income = db.session.query(func.sum(Transaction.amount))\
        .filter(Transaction.type == 'income').scalar() or 1
    total_expense = db.session.query(func.sum(Transaction.amount))\
        .filter(Transaction.type == 'expense').scalar() or 0
    
    trends['income_expense_ratio'] = total_income / (total_expense or 1)
    
    return jsonify(trends)

@app.route('/api/analytics/cashflow', methods=['GET'])
def get_cashflow_analysis():
    # Cumulative cashflow over time
    transactions = Transaction.query.order_by(Transaction.date).all()
    
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
