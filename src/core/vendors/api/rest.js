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

import bookingV1 from '../components/booking/api/rest.js'

const router = Router();

router.use('/booking', bookingV1)

// Add a vendor
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createAccount);

      const { vendorName, pan, mobile, email, bankAccount, gstNumber, accountBranch, ifscCode, address, department } = req.body;

      const [vendor] = await KNEX(TABLES.Vendors).where({ pan } || { email } || { bankAccount, accountBranch, ifscCode });

      if (vendor) {
        return res.status(400).json({
          success: false,
          message: 'Vendor pan or email or bank account already exists',
        });
      }

      await KNEX(TABLES.Vendors).insert({ vendorName, pan, mobile, email, bankAccount, gstNumber, accountBranch, ifscCode, address, department });

      return res.json({ success: true, message: 'Vendor inserted successfully' });
    } catch (error) {
      console.log(`Error in creating vendor: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all vendor
router.get('/', async (req, res) => {
  try {
    const vendors = await KNEX(TABLES.Vendors);

    return res.json({ success: true, data: vendors });
  } catch (error) {
    console.log(`Unable to fetch vendors: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update vendor details
router.put('/',
  // checkRole(USER_ROLES.SUPER_ADMIN), 
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.updateAccount);

      const { id, vendorName, pan, mobile, email, bankAccount, gstNumber, accountBranch, ifscCode, address, department } = req.body;

      const vendorWithGivenIdPromise = KNEX(TABLES.Vendors).where({ id });

      const [[vendorWithGivenId]] = await Promise.all([
        vendorWithGivenIdPromise,
      ]);

      if (!vendorWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      const [vendorWithPan] = await KNEX(TABLES.Vendors).where({ pan }).whereNot({ id });
      const [vendorWithEmail] = await KNEX(TABLES.Vendors).where({ email }).whereNot({ id });
      const [vendorWithBankDetils] = await KNEX(TABLES.Vendors).where({ bankAccount, ifscCode }).whereNot({ id });

      try {
        const [vendorWithGivenData] = await Promise.all([
          vendorWithPan,
          vendorWithEmail,
          vendorWithBankDetils
        ]);

        if (vendorWithGivenData) {
          return res.status(400).json({
            success: false,
            message: 'Vendor pan or email or bank account already exists',
          });
        }
      } catch (error) {
        console.log("error on promiss=>", error);
      }

      await KNEX(TABLES.Vendors).update({ vendorName, pan, mobile, email, bankAccount, gstNumber, accountBranch, ifscCode, address, department }).where({ id });

      return res.json({ success: true, message: 'Vendor updated successfully' });
    } catch (error) {
      console.log(`Error while updating vendor: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Disable vendor
router.post('/disable',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.enableOrDisableAccount);

      const { id } = req.body;

      const [stateWithGivenAccountNumber] = await KNEX(TABLES.Vendors).where({
        id,
        disabled: false,
      });

      if (!stateWithGivenAccountNumber) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      await KNEX(TABLES.Vendors).update({ disabled: true }).where({ id });

      return res.json({ success: true, message: 'Vendor disabled successfully' });
    } catch (error) {
      console.log(`Error while disabling vendor: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Enable vendor
router.post('/enable',
  // checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.enableOrDisableAccount);

      const { id } = req.body;

      const [stateWithGivenAccountNumber] = await KNEX(TABLES.Vendors).where({
        id,
        disabled: true,
      });

      if (!stateWithGivenAccountNumber) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      await KNEX(TABLES.Vendors).update({ disabled: false }).where({ id });

      return res.json({ success: true, message: 'Vendor enabled successfully' });
    } catch (error) {
      console.log(`Error while enabling vendor: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

export default router;
