import { Router } from 'express';
import validationSchemas from '../utils/validationSchema.js';
import { requestValidator } from '../../../utils/validator.js';
import { sanitizeAndValidateRequest } from '../../../utils/sanitize.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../constants.js';

const router = Router();

// Add a Socity budget
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createch.SocityBudget);

      const { budgetName, financialYear, budgetPeriod, budgetReport } = req.body;

      const [socityBudget] = await KNEX(TABLES.SocityBudget).where({ budgetName, financialYear, budgetPeriod });

      if (socityBudget) {
        return res.status(400).json({
          success: false,
          message: 'Socity budget with the name, financial yr and period already exists',
        });
      }

      await KNEX(TABLES.SocityBudget).insert({ budgetName, financialYear, budgetPeriod, budgetReport: JSON.stringify(budgetReport) });

      return res.json({ success: true, message: 'Socity budget inserted successfully' });
    } catch (error) {
      console.log(`Error in creating socity budget : ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all Socity budget
router.get('/', async (req, res) => {
  try {
    const socityBudget = await KNEX(TABLES.SocityBudget);

    return res.json({ success: true, data: socityBudget });
  } catch (error) {
    console.log(`Unable to fetch socity budgets: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update Socity budgets
router.put('/',
  // checkRole(USER_ROLES.SUPER_ADMIN), 
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.updatech.SocityBudget);

      const { id, budgetName, financialYear, budgetPeriod, budgetReport } = req.body;

      const budgetWithGivenIdPromise = KNEX(TABLES.SocityBudget).where({ id });

      const [[budgetWithGivenId]] = await Promise.all([
        budgetWithGivenIdPromise,
      ]);

      if (!budgetWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Socity budgets not found',
        });
      }

      // if (accountWithGivenAccountNumber) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Account with this account number already exists',
      //   });
      // }

      await KNEX(TABLES.SocityBudget).update({ budgetName, financialYear, budgetPeriod, budgetReport: JSON.stringify(budgetReport) }).where({ id });

      return res.json({ success: true, message: 'Socity budget updated successfully' });
    } catch (error) {
      console.log(`Error while updating Socity budget: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

export default router;
