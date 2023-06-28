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

// Add a chargeList
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createch.ChargetList);

      const { chargeName, accountId , account, chartOfAccountId, chargeData } = req.body;

      // const [chartOfAccount] = await KNEX(TABLES.ChargetList).where({ accountName, generalLedgerID  });

      // if (chartOfAccount) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Charge list with this general ledger and sub catagory already exists',
      //   });
      // }

      await KNEX(TABLES.ChargetList).insert({ chargeName, accountId , account, chartOfAccountId, chargeData: JSON.stringify(chargeData) });

      return res.json({ success: true, message: 'Charge list inserted successfully' });
    } catch (error) {
      console.log(`Error in creating charge list : ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all chargeList
router.get('/', async (req, res) => {
  try {
    const chargeList = await KNEX(TABLES.ChargetList);

    return res.json({ success: true, data: chargeList });
  } catch (error) {
    console.log(`Unable to fetch charge lists: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update Charge lists
router.put('/',
  // checkRole(USER_ROLES.SUPER_ADMIN), 
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.updatech.ChargetList);

      const { id, chargeName, accountId , account, chartOfAccountId, chargeData } = req.body;

      const accountWithGivenGlIdPromise = KNEX(TABLES.ChargetList).where({ id });

      const [[accountWithGivenGlId]] = await Promise.all([
        accountWithGivenGlIdPromise,
      ]);

      if (!accountWithGivenGlId) {
        return res.status(404).json({
          success: false,
          message: 'Charge lists not found',
        });
      }

      // if (accountWithGivenAccountNumber) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Account with this account number already exists',
      //   });
      // }

      await KNEX(TABLES.ChargetList).update({ chargeName, accountId , account, chartOfAccountId, chargeData: JSON.stringify(chargeData) }).where({ id });

      return res.json({ success: true, message: 'Charge list updated successfully' });
    } catch (error) {
      console.log(`Error while updating Charge list: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

export default router;
