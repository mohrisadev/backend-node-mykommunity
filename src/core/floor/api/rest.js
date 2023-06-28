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

// Create a floor in a block
router.post(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      sanitizeAndValidateRequest(req.body, validationSchemas.createFloor, {
        BEFORE_VALIDATION: {
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { blockId, name } = req.body;

      const [floor] = await KNEX(TABLES.Floors).where({
        name,
        blockId,
      });

      if (floor) {
        return res.status(400).json({
          success: false,
          message: 'Floor already exists in the block',
        });
      }

      await KNEX(TABLES.Floors).insert({ name, blockId });

      return res.json({
        success: true,
        message: 'Floor inserted successfully',
      });
    } catch (error) {
      console.log(`Error in creating floor: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  },
);

// Get all floors in a block
router.get('/', async (req, res) => {
  try {
    requestValidator(req.query, validationSchemas.getFloorsByBlockId);

    const { blockId } = req.query;

    const floors = await KNEX(TABLES.Floors)
      .where({ blockId })
      .orderBy('name', 'asc');

    return res.json({ success: true, data: floors });
  } catch (error) {
    console.log(`Unable to fetch floors: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Get all floors in a society
router.get('/find-by-society', async (req, res) => {
  try {
    requestValidator(req.query, validationSchemas.getFloorsBySocietyId);

    const { societyId } = req.query;

    const floors = await KNEX(TABLES.Floors)
      .select([
        `${TABLES.Floors}.id`,
        `${TABLES.Floors}.name`,
        `${TABLES.Floors}.disabled`,
        `${TABLES.Blocks}.name as blockName`,
      ])
      .leftJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .where({ [`${TABLES.Blocks}.societyId`]: societyId })
      .orderBy(`${TABLES.Floors}.name`, 'asc');

    return res.json({ success: true, data: floors });
  } catch (error) {
    console.log(`Unable to fetch floors: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Update name or block for a floor
router.post(
  '/update',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.updateFloor);

      const { id, blockId, name } = req.body;

      const floorWithGivenIdPromise = KNEX(TABLES.Floors).where({ id });
      const floorWithGivenNameAndBlockPromise = KNEX(TABLES.Floors)
        .where({
          name,
          blockId,
        })
        .andWhereNot({ id });

      const [[floorWithGivenId], [floorWithGivenNameAndBlock]] =
        await Promise.all([
          floorWithGivenIdPromise,
          floorWithGivenNameAndBlockPromise,
        ]);

      if (!floorWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Floor not found',
        });
      } else if (floorWithGivenNameAndBlock) {
        return res.status(400).json({
          success: false,
          message: 'Floor name already exists in Block',
        });
      }

      await KNEX(TABLES.Floors).update({ name }).where({ id });

      return res.json({ success: true, message: 'Floor updated successfully' });
    } catch (error) {
      console.log(`Error while updating floor: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  },
);

// Disable a floor
router.post('/disable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableFloor);

    const { id } = req.body;

    const [floorWithGivenId] = await KNEX(TABLES.Floors).where({
      id,
      disabled: false,
    });

    if (!floorWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'Floor not found',
      });
    }

    await KNEX(TABLES.Floors).update({ disabled: true }).where({ id });

    return res.json({ success: true, message: 'Floor disabled successfully' });
  } catch (error) {
    console.log(`Error while disabling floor: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

// Enable a floor
router.post('/enable', checkRole(USER_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    requestValidator(req.body, validationSchemas.enableOrDisableFloor);

    const { id } = req.body;

    const [floorWithGivenId] = await KNEX(TABLES.Floors).where({
      id,
      disabled: true,
    });

    if (!floorWithGivenId) {
      return res.status(404).json({
        success: false,
        message: 'Floor not found',
      });
    }

    await KNEX(TABLES.Floors).update({ disabled: false }).where({ id });

    return res.json({ success: true, message: 'Floor enabled successfully' });
  } catch (error) {
    console.log(`Error while enabling floor: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

export default router;
