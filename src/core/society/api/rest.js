import { Router } from 'express';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

import { checkRole } from '../../../middlewares/checkRole.js';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
} from '../../../constants.js';
import { sanitizeAndValidateRequest } from '../../../utils/sanitize.js';

import imageRoutes from '../components/images/api/rest.js';
import securityRoutes from '../components/security/api/rest.js';
import gateRoutes from '../components/gates/api/rest.js';

const router = Router();

router.use('/images', checkRole([USER_ROLES.SOCIETY_ADMIN]), imageRoutes);
router.use('/security', securityRoutes);
router.use('/gate', gateRoutes);

// Create a new society
router.post(
  '/',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      sanitizeAndValidateRequest(req.body, validationSchemas.createSociety, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
          builderName: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
          address: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name, cityId, pinCode, builderName, address, images } = req.body;

      const [society] = await KNEX(TABLES.Societies).where({
        name: name,
        pinCode: pinCode,
      });

      if (society) {
        return res.status(400).json({
          success: false,
          message: 'Society with same name exists in this City already',
        });
      }

      const [{ id: societyId }] = await KNEX(TABLES.Societies)
        .insert({
          name,
          cityId,
          pinCode,
          builderName,
          address,
        })
        .returning('id');

      if (images.length > 0) {
        const imagesData = images.map((image) => {
          return { image: image.trim(), societyId };
        });

        await KNEX(TABLES.SocietyImages).insert(imagesData);
      }

      return res.json({ success: true, message: 'Society added successfully' });
    } catch (error) {
      console.log(`Error in creating society: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

// Update society
router.post(
  '/update',
  checkRole([USER_ROLES.SOCIETY_ADMIN, USER_ROLES.SUPER_ADMIN]),
  async (req, res) => {
    try {
      sanitizeAndValidateRequest(req.body, validationSchemas.updateSociety, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
          builderName: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
          address: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name, pinCode, builderName, address, id } = req.body;

      const [society] = await KNEX(TABLES.Societies)
        .where({
          name: name,
          pinCode: pinCode,
        })
        .andWhereNot({ id });

      if (society) {
        return res.status(400).json({
          success: false,
          message: 'Society with same name exists in this Pin Code already',
        });
      }

      await KNEX(TABLES.Societies)
        .update({ name, pinCode, builderName, address })
        .where({ id });

      return res.json({
        success: true,
        message: 'Society updated successfully',
      });
    } catch (error) {
      console.log(`Error in updating society: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.get('/', async (req, res) => {
  try {
    requestValidator(req.query, validationSchemas.getSocietiesByCityId);

    const { cityId } = req.query;

    // Get society data
    const societies = await KNEX(TABLES.Societies).where({ cityId });

    // Return society data
    return res.status(200).json({ success: true, data: societies });
  } catch (error) {
    console.log(`Error in fetching societies by city: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    // Get society data
    const societies = await KNEX(TABLES.Societies)
      .select([
        `${TABLES.Societies}.id`,
        `${TABLES.Societies}.name`,
        `${TABLES.Societies}.pinCode`,
        `${TABLES.Societies}.builderName`,
        `${TABLES.Societies}.address`,
        `${TABLES.Societies}.createdAt`,
        `${TABLES.Cities}.name as cityName`,
        `${TABLES.States}.name as stateName`,
      ])
      .innerJoin(
        TABLES.Cities,
        `${TABLES.Societies}.cityId`,
        `${TABLES.Cities}.id`,
      )
      .innerJoin(
        TABLES.States,
        `${TABLES.States}.id`,
        `${TABLES.Cities}.stateId`,
      );

    // Return society data
    return res.status(200).json({ success: true, data: societies });
  } catch (error) {
    console.log(`Error in fetching societies by city: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get society by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const societyPromise = KNEX(TABLES.Societies)
      .select([
        `${TABLES.Cities}.name as city`,
        `${TABLES.States}.name as state`,
        '*',
        `${TABLES.Societies}.id as id`,
      ])
      .innerJoin(
        TABLES.Cities,
        `${TABLES.Cities}.id`,
        `${TABLES.Societies}.cityId`,
      )
      .innerJoin(
        TABLES.States,
        `${TABLES.States}.id`,
        `${TABLES.Cities}.stateId`,
      )
      .where({ [`${TABLES.Societies}.id`]: id });

    const imagesPromise = KNEX(TABLES.SocietyImages)
      .select(['image', 'id'])
      .where({ societyId: id });

    const [[society], images] = await Promise.all([
      societyPromise,
      imagesPromise,
    ]);

    if (!society) {
      return res
        .status(404)
        .json({ success: false, message: `Society with id ${id} not found` });
    }

    society.images = images;

    return res.status(200).json({ success: true, data: society });
  } catch (error) {
    console.log(`Error in fetching society by id: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Disable a society
router.post('/disable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableSociety);

    const { id } = req.body;

    const [societyWithGivenId] = await KNEX(TABLES.Societies).where({
      id,
      disabled: false,
    });

    if (!societyWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'Society not found',
      });
    }

    await KNEX(TABLES.Societies).update({ disabled: true }).where({ id });

    return res.json({
      success: true,
      message: 'Society disabled successfully',
    });
  } catch (error) {
    console.log(`Error while disabling society: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Enable a society
router.post('/enable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableSociety);

    const { id } = req.body;

    const [societyWithGivenId] = await KNEX(TABLES.Societies).where({
      id,
      disabled: true,
    });

    if (!societyWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'Society not found',
      });
    }

    await KNEX(TABLES.Societies).update({ disabled: false }).where({ id });

    return res.json({ success: true, message: 'Society enabled successfully' });
  } catch (error) {
    console.log(`Error while enabling society: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

export default router;
