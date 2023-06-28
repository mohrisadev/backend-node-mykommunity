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

// Add a cashTransferDetails
router.post('/',
  //  checkRole(USER_ROLES.SUPER_ADMIN),
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.createch.TransactionDetails);

      const { transactionDate, fromAccount = 'N/A', toAccount, chequeDate = transactionDate, chequeNumber = 'N/A', description, reference, amount, type, credit, debit } = req.body;

      // if (type == 'cash') { transactionDate, toAccount, description, reference, amount, type }
      if (type == 'cheque') {

        const [transactionData] = await KNEX(TABLES.TransactionDetails).where({ fromAccount, chequeNumber });

        if (transactionData) {
          return res.status(400).json({
            success: false,
            message: 'cheque number with from account already exists',
          });
        }


      }



      await KNEX(TABLES.TransactionDetails).insert({ transactionDate, fromAccount, toAccount, chequeDate, chequeNumber, description, reference, amount, type, credit, debit });

      return res.json({ success: true, message: 'Transaction inserted successfully' });
    } catch (error) {
      console.log(`Error in add transaction : ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

// Get all cash transactions
router.get('/cash', async (req, res) => {
  try {
    const generalLedgers = await KNEX(TABLES.TransactionDetails).where({ type: 'cash' });

    return res.json({ success: true, data: generalLedgers });
  } catch (error) {
    console.log(`Unable to fetch chart of accounts: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Get all cheque transactions
router.get('/cheque', async (req, res) => {
  try {
    const generalLedgers = await KNEX(TABLES.TransactionDetails).where({ type: 'cheque' });

    return res.json({ success: true, data: generalLedgers });
  } catch (error) {
    console.log(`Unable to fetch chart of accounts: ${error}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update Transaction Details
router.put('/',
  // checkRole(USER_ROLES.SUPER_ADMIN), 
  async (req, res) => {
    try {
      // requestValidator(req.body, validationSchemas.updatech.TransactionDetails);

      const { transactionId, transactionDate, fromAccount = 'N/A', toAccount, chequeDate = transactionDate, chequeNumber = 'N/A', description, reference, amount, type, credit, debit } = req.body;

      const transactionOnGivenIDPromise = KNEX(TABLES.TransactionDetails).where({ transactionId });

      const [[transactionOnGivenID]] = await Promise.all([
        transactionOnGivenIDPromise,
      ]);

      if (!transactionOnGivenID) {
        return res.status(404).json({
          success: false,
          message: 'Transaction Id not found',
        });
      }

      await KNEX(TABLES.TransactionDetails).update({ transactionDate, fromAccount, toAccount, chequeDate, chequeNumber, description, reference, amount, type, credit, debit }).where({ transactionId });

      return res.json({ success: true, message: 'Transaction updated successfully' });
    } catch (error) {
      console.log(`Error while updating Transaction: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  });

export default router;
