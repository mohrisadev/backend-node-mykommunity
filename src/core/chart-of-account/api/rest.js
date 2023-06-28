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

// Add a generalLedgers
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createch.ChartOfAccount);

      const { accountName, generalLedgerID , cashAcount, transactionAccount } = req.body;

      const [chartOfAccount] = await KNEX(TABLES.ChartOfAccount).where({ accountName, generalLedgerID  });

      if (chartOfAccount) {
        return res.status(400).json({
          success: false,
          message: 'Chart of account with this general ledger and sub catagory already exists',
        });
      }

      await KNEX(TABLES.ChartOfAccount).insert({ accountName, generalLedgerID, cashAcount, transactionAccount });

      return res.json({ success: true, message: 'Chart of account inserted successfully' });
    } catch (error) {
      console.log(`Error in creating chart of account : ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all generalLedgers
router.get('/', async (req, res) => {
  try {
    const generalLedgers = await KNEX(TABLES.ChartOfAccount);

    return res.json({ success: true, data: generalLedgers });
  } catch (error) {
    console.log(`Unable to fetch chart of accounts: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update Chart of accounts
router.put('/',
  // checkRole(USER_ROLES.SUPER_ADMIN), 
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.updatech.ChartOfAccount);

      const { id, accountName, generalLedgerID, cashAcount, transactionAccount } = req.body;

      const accountWithGivenGlIdPromise = KNEX(TABLES.ChartOfAccount).where({ id });

      const [[accountWithGivenGlId]] = await Promise.all([
        accountWithGivenGlIdPromise,
      ]);

      if (!accountWithGivenGlId) {
        return res.status(404).json({
          success: false,
          message: 'Chart of accounts not found',
        });
      }

      // if (accountWithGivenAccountNumber) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Account with this account number already exists',
      //   });
      // }

      await KNEX(TABLES.ChartOfAccount).update({ accountName, generalLedgerID, cashAcount, transactionAccount }).where({ id });

      return res.json({ success: true, message: 'Chart of account updated successfully' });
    } catch (error) {
      console.log(`Error while updating Chart of account: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

export default router;
