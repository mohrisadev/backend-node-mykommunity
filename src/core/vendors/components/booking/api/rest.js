import { Router } from 'express';
import validationSchemas from '../utils/validationSchema.js';
import { requestValidator } from '../../../../../utils/validator.js';
import { sanitizeAndValidateRequest } from '../../../../../utils/sanitize.js';
import { KNEX, TABLES } from '../../../../../services/knex.js';
import { checkRole } from '../../../../../middlewares/checkRole.js';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../../../constants.js';

const router = Router();

// Add a vendor
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createAccount);

      const { vendorId, invoiceNumber, billDate, expensionCreationDate, dueDate, itemDetails } = req.body;

      const [bookingInvoice] = await KNEX(TABLES.VendorBookings).where({ invoiceNumber });

      if (bookingInvoice) {
        return res.status(400).json({
          success: false,
          message: 'Invoice already exists',
        });
      }

      await KNEX(TABLES.VendorBookings).insert({ vendorId, invoiceNumber, billDate, expensionCreationDate, dueDate, itemDetails: JSON.stringify(itemDetails) });

      return res.json({ success: true, message: 'Vendor booking inserted successfully' });
    } catch (error) {
      console.log(`Error in creating vendor booking: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all booking
router.get('/', async (req, res) => {
  try {
    const bookings = await KNEX(TABLES.VendorBookings);

    return res.json({ success: true, data: bookings });
  } catch (error) {
    console.log(`Unable to fetch vendor bookings: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update vendor details
router.put('/',
  // checkRole(USER_ROLES.SUPER_ADMIN), 
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.updateAccount);

      const { id,  vendorId, invoiceNumber, billDate, expensionCreationDate, dueDate, itemDetails } = req.body;

      const vendorBookingWithGivenIdPromise = KNEX(TABLES.VendorBookings).where({ id });

      const [[vendorBookingWithGivenId]] = await Promise.all([
        vendorBookingWithGivenIdPromise,
      ]);

      if (!vendorBookingWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Booking details not found',
        });
      }

  

      await KNEX(TABLES.VendorBookings).update({  vendorId, invoiceNumber, billDate, expensionCreationDate, dueDate, itemDetails }).where({ id });

      return res.json({ success: true, message: 'Vendor booking updated successfully' });
    } catch (error) {
      console.log(`Error while updating vendor booking: ${error.message}`);
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

      const [stateWithGivenAccountNumber] = await KNEX(TABLES.Vendors).where({
        accountNumber,
        disabled: false,
      });

      if (!stateWithGivenAccountNumber) {
        return res.status(404).json({
          success: false,
          message: 'Account not found',
        });
      }

      await KNEX(TABLES.Vendors).update({ disabled: true }).where({ accountNumber });

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

      const [stateWithGivenAccountNumber] = await KNEX(TABLES.Vendors).where({
        accountNumber,
        disabled: true,
      });

      if (!stateWithGivenAccountNumber) {
        return res.status(404).json({
          success: false,
          message: 'Account not found',
        });
      }

      await KNEX(TABLES.Vendors).update({ disabled: false }).where({ accountNumber });

      return res.json({ success: true, message: 'Account enabled successfully' });
    } catch (error) {
      console.log(`Error while enabling account: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

export default router;
