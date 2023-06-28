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
      // requestValidator(req.body, validationSchemas.createGeneralLedger);

      const { generalLedgerName , subCatagory  } = req.body;

      const [generalLedger] = await KNEX(TABLES.GeneralLedger).where({ generalLedgerName , subCatagory });
      
      if (generalLedger) {
        return res.status(400).json({
          success: false,
          message: 'General Ledger with this subcatagory already exists',
        });
      }

      await KNEX(TABLES.GeneralLedger).insert({ generalLedgerName, subCatagory });

      return res.json({ success: true, message: 'General Ledger inserted successfully' });
    } catch (error) {
      console.log(`Error in creating general ledger : ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all generalLedgers
router.get('/', async (req, res) => {
  try {
    const generalLedgers = await KNEX(TABLES.GeneralLedger);

    return res.json({ success: true, data: generalLedgers });
  } catch (error) {
    console.log(`Unable to fetch general ledgers: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update General Ledgers
router.put('/', 
// checkRole(USER_ROLES.SUPER_ADMIN), 
async (req, res) => {
  try {
    // requestValidator(req.body, validationSchemas.updateGeneralLedger);

    const { id, generalLedgerName , subCatagory } = req.body;

    const accountWithGivenGlIdPromise = KNEX(TABLES.GeneralLedger).where({ id });
    
    const [[accountWithGivenGlId]] = await Promise.all([
      accountWithGivenGlIdPromise,
    ]);

    if (!accountWithGivenGlId) {
      return res.status(404).json({
        success: false,
        message: 'General Ledgers not found',
      });
    }

    // if (accountWithGivenAccountNumber) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Account with this account number already exists',
    //   });
    // }

    await KNEX(TABLES.GeneralLedger).update({ generalLedgerName , subCatagory }).where({ id });

    return res.json({ success: true, message: 'General Ledger updated successfully' });
  } catch (error) {
    console.log(`Error while updating General Ledger: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Disable account
router.patch('/disable',
//  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
  try {
    // requestValidator(req.body, validationSchemas.enableOrDisableGeneralLedger);

    const { id } = req.body;

    const [stateWithGivenGlId] = await KNEX(TABLES.GeneralLedger).where({
      id,
      disabled: false,
    });

    if (!stateWithGivenGlId) {
      return res.status(404).json({
        success: false,
        message: 'General Ledger  not found',
      });
    }

    await KNEX(TABLES.GeneralLedger).update({ disabled: true }).where({ id });

    return res.json({ success: true, message: 'General Ledger disabled successfully' });
  } catch (error) {
    console.log(`Error while disabling general Ledger: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Enable state
router.patch('/enable', 
// checkRole(USER_ROLES.SUPER_ADMIN),
 async (req, res) => {
  try {
    // requestValidator(req.body, validationSchemas.enableOrDisableGeneralLedger);

    const { id } = req.body;

    const [stateWithGivenGlId] = await KNEX(TABLES.GeneralLedger).where({
      id,
      disabled: true,
    });

    if (!stateWithGivenGlId) {
      return res.status(404).json({
        success: false,
        message: 'General Ledger not found',
      });
    }

    await KNEX(TABLES.GeneralLedger).update({ disabled: false }).where({ id });

    return res.json({ success: true, message: 'General Ledger enabled successfully' });
  } catch (error) {
    console.log(`Error while enabling general Ledger: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

export default router;
