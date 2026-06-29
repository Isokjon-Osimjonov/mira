import { Router } from 'express'
import * as ctrl from './expenses.controller'
import { requireAdmin, requirePermission } from '../../middleware/auth'

const expCategoriesRouter = Router()
const expensesRouter = Router()

expCategoriesRouter.use(requireAdmin)
expensesRouter.use(requireAdmin)

// Expense Categories
expCategoriesRouter.get('/', requirePermission('expenses', 'read'), ctrl.getCategories)
expCategoriesRouter.post('/', requirePermission('expenses', 'write'), ctrl.createCategory)
expCategoriesRouter.put('/:id', requirePermission('expenses', 'write'), ctrl.updateCategory)
expCategoriesRouter.delete('/:id', requirePermission('expenses', 'delete'), ctrl.deleteCategory) // Assuming delete permission or fallback to write

// Expenses
expensesRouter.get('/categories', requirePermission('expenses', 'read'), ctrl.getCategories)
expensesRouter.post('/categories', requirePermission('expenses', 'write'), ctrl.createCategory)
expensesRouter.patch('/categories/:id', requirePermission('expenses', 'write'), ctrl.updateCategory)
expensesRouter.delete(
  '/categories/:id',
  requirePermission('expenses', 'delete'),
  ctrl.deleteCategory
)

expensesRouter.get('/', requirePermission('expenses', 'read'), ctrl.getExpenses)
expensesRouter.get('/summary', requirePermission('expenses', 'read'), ctrl.getSummary) // MUST be before /:id
expensesRouter.get('/:id', requirePermission('expenses', 'read'), ctrl.getExpenseById)
expensesRouter.post('/', requirePermission('expenses', 'write'), ctrl.createExpense)
expensesRouter.put('/:id', requirePermission('expenses', 'write'), ctrl.updateExpense)
expensesRouter.delete('/:id', requirePermission('expenses', 'delete'), ctrl.deleteExpense)

export { expCategoriesRouter, expensesRouter }
