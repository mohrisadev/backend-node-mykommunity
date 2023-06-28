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

// Add a account
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createAccount);

      const { accountNumber, bankName, accountHolderName, ifscCode } = req.body;

      const [account] = await KNEX(TABLES.Accounts).where({ accountNumber });
      
      if (account) {
        return res.status(400).json({
          success: false,
          message: 'Account already exists',
        });
      }

      await KNEX(TABLES.Accounts).insert({ accountNumber, bankName, accountHolderName, ifscCode });

      return res.json({ success: true, message: 'Account inserted successfully' });
    } catch (error) {
      console.log(`Error in creating account: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all account
router.get('/', async (req, res) => {
  try {
    const accounts = await KNEX(TABLES.Accounts);

    return res.json({ success: true, data: accounts });
  } catch (error) {
    console.log(`Unable to fetch accounts: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update account details
router.put('/', 
// checkRole(USER_ROLES.SUPER_ADMIN), 
async (req, res) => {
  try {
    // requestValidator(req.body, validationSchemas.updateAccount);

    const { accountNumber, bankName, accountHolderName, ifscCode } = req.body;

    const accountWithGivenAccountNumberPromise = KNEX(TABLES.Accounts).where({ accountNumber });
    
    const [[accountWithGivenAccountNumber]] = await Promise.all([
      accountWithGivenAccountNumberPromise,
    ]);

    if (!accountWithGivenAccountNumber) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // if (accountWithGivenAccountNumber) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Account with this account number already exists',
    //   });
    // }

    await KNEX(TABLES.Accounts).update({ accountNumber, bankName, accountHolderName, ifscCode }).where({ accountNumber });

    return res.json({ success: true, message: 'Account updated successfully' });
  } catch (error) {
    console.log(`Error while updating account: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Disable account
router.post('/disable',
//  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
  try {
    // requestValidator(req.body, validationSchemas.enableOrDisableAccount);

    const { accountNumber } = req.body;

    const [stateWithGivenAccountNumber] = await KNEX(TABLES.Accounts).where({
      accountNumber,
      disabled: false,
    });

    if (!stateWithGivenAccountNumber) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    await KNEX(TABLES.Accounts).update({ disabled: true }).where({ accountNumber });

    return res.json({ success: true, message: 'Account disabled successfully' });
  } catch (error) {
    console.log(`Error while disabling account: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Enable account
router.post('/enable', 
// checkRole(USER_ROLES.SUPER_ADMIN),
 async (req, res) => {
  try {
    // requestValidator(req.body, validationSchemas.enableOrDisableAccount);

    const { accountNumber } = req.body;

    const [stateWithGivenAccountNumber] = await KNEX(TABLES.Accounts).where({
      accountNumber,
      disabled: true,
    });

    if (!stateWithGivenAccountNumber) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    await KNEX(TABLES.Accounts).update({ disabled: false }).where({ accountNumber });

    return res.json({ success: true, message: 'Account enabled successfully' });
  } catch (error) {
    console.log(`Error while enabling account: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

export default router;
