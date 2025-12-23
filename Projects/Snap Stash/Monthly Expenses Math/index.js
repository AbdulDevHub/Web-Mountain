function roll(min, max, floatFlag) {
    let r = Math.random() * (max - min) + min
    return floatFlag ? r : Math.floor(r)
}

let startDay = new Date("3/15/2020")
let month = buildMonth(startDay)


// Generate a Monthly Budget (Subtract Rent/Utils)
let annualIncome = roll(31000, 40000, 1).toFixed(2)
let monthlyIncome = parseFloat(annualIncome) / 12
let rent = roll(1200, 1800, 1).toFixed(2)
let utilities = roll(300, 500, 1).toFixed(2)
let monthlyBudget = monthlyIncome - parseFloat(rent) - parseFloat(utilities)
let monthlyNetValue = getMonthNetValue()

displayMonth(month, monthlyBudget, monthlyNetValue)
displayExpenses()

// Generate / Display Random Expenses
function generateExpenses() {
    let expenseCount = roll(0, 4)
    return [...Array(expenseCount)].map((_, i) => {
        return {
            index: i,
            value: roll(1, 30, 1)
        }
    })
}

function displayExpenses() {
    let days = document.getElementsByClassName('day')
    Array.from(days).forEach(function(day, i) {
        let dayHtml = day.innerHTML
        dayHtml += month[i].expenses.reduce(function(accum, expense) {
            return accum + `<div class="expense">
                -\$${expense.value.toFixed(2)}
            </div>`    
        }, '')
        day.innerHTML = dayHtml
    })
}

// Calculate / Display Leftover Cash
function getMonthNetValue() {
    // let sampleDay = getDailyCost(month[0])
    let monthlyExpenseTotal = month.reduce(function(accum, day) {
        return accum + getDailyCost(day)    
    }, 0)
    
    return monthlyBudget - monthlyExpenseTotal
}

function getDailyCost(day) {
    return day.expenses.reduce(function(accum, expense) {
        return accum + parseFloat(expense.value)    
    }, 0)    
}

function getNextDay(day) {
    let nextDay = new Date(day)
    nextDay.setDate(day.getDate() + 1)
    return nextDay
}

function buildMonth(day) {
    let daysInMonth = getDaysInMonth(day.getMonth() + 1, day.getFullYear())
    let iterableDay = new Date(day)
    iterableDay.setDate(1)
    let month = [...Array(daysInMonth)].map((_, i) => {
        let monthDay = {
            index: i,
            date: iterableDay,
            expenses: generateExpenses()
        }
        iterableDay = getNextDay(iterableDay)
        return monthDay
    })
    return month
}

function getDaysInMonth(month, year) {
    return new Date(year, month, 0).getDate()
}

function displayMonth(month, budget, netValue) {
    let monthHtml = `<div class="monthly-summary">
        Budget: \$${budget.toFixed(2)} | Net Value: \$${netValue.toFixed(2)}
    </div>` +
    month.reduce(function(accumulator, day) {
        return accumulator + `<div class="day">${day.date.getDate()}</div>`    
    }, '')
    document.getElementById('MonthlyExpenses').innerHTML = monthHtml
}

// CoderRadical.gmail.com
// Twitch/YouTube @ RadicalCoder