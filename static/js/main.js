// Initialize expense chart
let expenseChart;

// Monthly chart
let monthlyChart;
// Cashflow chart
let cashflowChart;

// Format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

// Update summary cards
const updateSummary = async () => {
    const response = await fetch('/api/analytics');
    const data = await response.json();

    document.getElementById('total-income').textContent = formatCurrency(data.total_income);
    document.getElementById('total-expenses').textContent = formatCurrency(data.total_expenses);
    document.getElementById('balance').textContent = formatCurrency(data.balance);

    // Update chart
    if (expenseChart) {
        expenseChart.destroy();
    }

    const categories = Object.keys(data.category_expenses);
    const amounts = Object.values(data.category_expenses);

    expenseChart = new Chart(document.getElementById('expense-chart'), {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Expenses by Category'
                }
            }
        }
    });
};

// Update transactions table
const updateTransactions = async () => {
    const response = await fetch('/api/transactions');
    const transactions = await response.json();

    const tableBody = document.getElementById('transactions-table');
    tableBody.innerHTML = '';

    transactions.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.date}</td>
            <td><span class="badge bg-${t.type === 'income' ? 'success' : 'danger'}">${t.type}</span></td>
            <td>${t.category}</td>
            <td>${t.description}</td>
            <td>${formatCurrency(t.amount)}</td>
        `;
        tableBody.appendChild(row);
    });
};

// Update monthly analytics
const updateMonthlyAnalytics = async () => {
    const response = await fetch('/api/analytics/monthly');
    const monthlyData = await response.json();

    // Prepare data for chart
    const labels = Object.keys(monthlyData);
    const incomeData = labels.map(key => monthlyData[key].income);
    const expenseData = labels.map(key => monthlyData[key].expense);

    // Destroy existing chart if it exists
    if (monthlyChart) {
        monthlyChart.destroy();
    }

    // Create monthly chart
    monthlyChart = new Chart(document.getElementById('monthly-chart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Income and Expenses'
                }
            }
        }
    });
};

// Update financial trends
const updateFinancialTrends = async () => {
    const response = await fetch('/api/analytics/trends');
    const trends = await response.json();

    // Update average monthly income and expenses
    document.getElementById('avg-monthly-income').textContent = 
        formatCurrency(trends.avg_monthly_income);
    document.getElementById('avg-monthly-expense').textContent = 
        formatCurrency(trends.avg_monthly_expense);

    // Update top expense categories
    const topCategoriesList = document.getElementById('top-expense-categories');
    topCategoriesList.innerHTML = '';
    Object.entries(trends.top_expense_categories).forEach(([category, amount]) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            ${category}
            <span class="badge bg-primary rounded-pill">${formatCurrency(amount)}</span>
        `;
        topCategoriesList.appendChild(li);
    });

    // Update income/expense ratio
    document.getElementById('income-expense-ratio').textContent = 
        trends.income_expense_ratio.toFixed(2);
};

// Update cashflow analysis
const updateCashflowAnalysis = async () => {
    const response = await fetch('/api/analytics/cashflow');
    const cashflowData = await response.json();

    // Prepare data for chart
    const labels = cashflowData.map(entry => entry.date);
    const balanceData = cashflowData.map(entry => entry.cumulative_balance);

    // Destroy existing chart if it exists
    if (cashflowChart) {
        cashflowChart.destroy();
    }

    // Create cashflow chart
    cashflowChart = new Chart(document.getElementById('cashflow-chart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cumulative Balance',
                data: balanceData,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Cumulative Cashflow Over Time'
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
};

// Handle form submission
document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    await fetch('/api/transactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    e.target.reset();
    await updateTransactions();
    await updateSummary();
});

// Set default date to today
document.querySelector('input[name="date"]').valueAsDate = new Date();

// Modify the existing initial load to include new analytics
async function loadAllAnalytics() {
    await updateTransactions();
    await updateSummary();
    await updateMonthlyAnalytics();
    await updateFinancialTrends();
    await updateCashflowAnalysis();
}

// Replace initial load with new comprehensive load
loadAllAnalytics();
