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

// Create a city in a state
router.post('/', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    sanitizeAndValidateRequest(req.body, validationSchemas.createCity, {
      BEFORE_VALIDATION: {
        name: [
          REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
          REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
        ],
      },
    });

    const { stateId, name } = req.body;

    const [city] = await KNEX(TABLES.Cities).where({ name, stateId });

    if (city) {
      return res.status(400).json({
        success: false,
        message: 'City already exists in the state',
      });
    }

    await KNEX(TABLES.Cities).insert({ name, stateId });

    return res.json({ success: true, message: 'City inserted successfully' });
  } catch (error) {
    console.log(`Error in creating city: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Get all cities in a state
router.get('/', async (req, res) => {
  try {
    requestValidator(req.query, validationSchemas.getCitiesByStateId);

    const { stateId } = req.query;

    const cities = await KNEX(TABLES.Cities)
      .where({ stateId })
      .orderBy('name', 'asc');

    return res.json({ success: true, data: cities });
  } catch (error) {
    console.log(`Unable to fetch cities: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Get all cities in a state
router.get('/list', async (req, res) => {
  try {
    const cities = await KNEX(TABLES.Cities)
      .select([
        `${TABLES.Cities}.id`,
        `${TABLES.Cities}.name as city`,
        `${TABLES.States}.name as state`,
        `${TABLES.States}.id as stateId`,
        `${TABLES.Cities}.disabled`,
      ])
      .leftJoin(
        TABLES.States,
        `${TABLES.States}.id`,
        `${TABLES.Cities}.stateId`,
      );

    return res.json({ success: true, data: cities });
  } catch (error) {
    console.log(`Unable to fetch cities: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update name or state for a city
router.post('/update', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.updateCity);

    const { id, stateId, name } = req.body;

    const cityWithGivenIdPromise = KNEX(TABLES.Cities).where({ id });
    const cityWithGivenNameAndStatePromise = KNEX(TABLES.Cities)
      .where({
        name,
        stateId,
      })
      .andWhereNot({ id });

    const [[cityWithGivenId], [cityWithGivenNameAndState]] = await Promise.all([
      cityWithGivenIdPromise,
      cityWithGivenNameAndStatePromise,
    ]);

    if (!cityWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    } else if (cityWithGivenNameAndState) {
      return res.status(400).json({
        success: false,
        message: 'City name already exists in State',
      });
    }

    await KNEX(TABLES.Cities).update({ name, stateId }).where({ id });

    return res.json({ success: true, message: 'City updated successfully' });
  } catch (error) {
    console.log(`Error while updating city: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Disable a city
router.post('/disable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableCity);

    const { id } = req.body;

    const [cityWithGivenId] = await KNEX(TABLES.Cities).where({
      id,
      disabled: false,
    });

    if (!cityWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }

    await KNEX(TABLES.Cities).update({ disabled: true }).where({ id });

    return res.json({ success: true, message: 'City disabled successfully' });
  } catch (error) {
    console.log(`Error while disabling city: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Enable a city
router.post('/enable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableCity);

    const { id } = req.body;

    const [cityWithGivenId] = await KNEX(TABLES.Cities).where({
      id,
      disabled: true,
    });

    if (!cityWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'City not found',
      });
    }

    await KNEX(TABLES.Cities).update({ disabled: false }).where({ id });

    return res.json({ success: true, message: 'City enabled successfully' });
  } catch (error) {
    console.log(`Error while enabling city: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

export default router;
