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

// Add a state
router.post('/', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    sanitizeAndValidateRequest(req.body, validationSchemas.createState, {
      BEFORE_VALIDATION: {
        name: [
          REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
          REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
        ],
      },
    });

    const { name } = req.body;

    const [state] = await KNEX(TABLES.States).where({ name });

    if (state) {
      return res.status(400).json({
        success: false,
        message: 'State already exists',
      });
    }

    await KNEX(TABLES.States).insert({ name });

    return res.json({ success: true, message: 'State inserted successfully' });
  } catch (error) {
    console.log(`Error in creating state: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Get all states
router.get('/', async (req, res) => {
  try {
    const states = await KNEX(TABLES.States).orderBy('name', 'asc');

    return res.json({ success: true, data: states });
  } catch (error) {
    console.log(`Unable to fetch states: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update state name
router.post('/update', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    sanitizeAndValidateRequest(req.body, validationSchemas.updateState, {
      BEFORE_VALIDATION: {
        name: [
          REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
          REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
        ],
      },
    });

    const { id, name } = req.body;

    const stateWithGivenIdPromise = KNEX(TABLES.States).where({ id });
    const stateWithGivenNamePromise = KNEX(TABLES.States)
      .where({ name })
      .andWhereNot({ id });

    const [[stateWithGivenId], [stateWithGivenName]] = await Promise.all([
      stateWithGivenIdPromise,
      stateWithGivenNamePromise,
    ]);

    if (!stateWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'State not found',
      });
    }

    if (stateWithGivenName) {
      return res.status(400).json({
        success: false,
        message: 'State with this name already exists',
      });
    }

    await KNEX(TABLES.States).update({ name }).where({ id });

    return res.json({ success: true, message: 'State updated successfully' });
  } catch (error) {
    console.log(`Error while updating state: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Disable state
router.post('/disable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableState);

    const { id } = req.body;

    const [stateWithGivenId] = await KNEX(TABLES.States).where({
      id,
      disabled: false,
    });

    if (!stateWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'State not found',
      });
    }

    await KNEX(TABLES.States).update({ disabled: true }).where({ id });

    return res.json({ success: true, message: 'State disabled successfully' });
  } catch (error) {
    console.log(`Error while disabling state: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Enable state
router.post('/enable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableState);

    const { id } = req.body;

    const [stateWithGivenId] = await KNEX(TABLES.States).where({
      id,
      disabled: true,
    });

    if (!stateWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'State not found',
      });
    }

    await KNEX(TABLES.States).update({ disabled: false }).where({ id });

    return res.json({ success: true, message: 'State enabled successfully' });
  } catch (error) {
    console.log(`Error while enabling state: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

export default router;
