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

// Add a rentalsetup
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createch.RentalSetup);

      const { flatId, area , credit, debit, houseType } = req.body;

      // const [chartOfAccount] = await KNEX(TABLES.RentalSetup).where({ flatId  });

      // if (chartOfAccount) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Chart of account with this general ledger and sub catagory already exists',
      //   });
      // }

      await KNEX(TABLES.RentalSetup).insert({ flatId, area , credit, debit, houseType });

      return res.json({ success: true, message: 'Rental setup inserted successfully' });
    } catch (error) {
      console.log(`Error in creating rental setup : ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all rentalsetup
router.get('/', async (req, res) => {
  try {
    const rentalsetup = await KNEX(TABLES.RentalSetup);

    return res.json({ success: true, data: rentalsetup });
  } catch (error) {
    console.log(`Unable to fetch rental Setups: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update Chart of accounts
router.put('/',
  // checkRole(USER_ROLES.SUPER_ADMIN), 
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.updatech.RentalSetup);

      const { id, flatId, area , credit, debit, houseType } = req.body;

      const rentalSetupWithIdPromise = KNEX(TABLES.RentalSetup).where({ id });

      const [[rentalSetupWithId]] = await Promise.all([
        rentalSetupWithIdPromise,
      ]);

      if (!rentalSetupWithId) {
        return res.status(404).json({
          success: false,
          message: 'Rental setup not found',
        });
      }

      // if (accountWithGivenAccountNumber) {
      //   return res.status(400).json({
      //     success: false,
      //     message: 'Account with this account number already exists',
      //   });
      // }

      await KNEX(TABLES.RentalSetup).update({ flatId, area , credit, debit, houseType }).where({ id });

      return res.json({ success: true, message: 'rental setup updated successfully' });
    } catch (error) {
      console.log(`Error while updating rental setup: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

export default router;
