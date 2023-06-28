import { Router } from 'express';
import {
  REQUEST_VALIDATOR_MODIFICATIONS,
  USER_ROLES,
  USER_ROLES_APPROVAL_STATUS,
} from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { sanitizeAndValidateRequest } from '../../../utils/sanitize.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

import membershipRoutes from '../components/membership/api/rest.js';
import vehicleRoutes from '../components/vehicle/api/rest.js';

const router = Router();

router.use('/membership', membershipRoutes);
router.use('/vehicle', vehicleRoutes);

// todo: tell paras, when user is assigned a rental unit, in user role add rental unit id and society id

// Create a new rental unit
router.post(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      sanitizeAndValidateRequest(req.body, validationSchemas.createRentalUnit, {
        BEFORE_VALIDATION: {
          type: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name, floorId, type } = req.body;

      const [rentalUnit] = await KNEX(TABLES.RentalUnits).where({
        name,
        floorId,
      });

      if (rentalUnit) {
        return res.status(400).json({
          success: false,
          message: 'Rental Unit already exists on this floor',
        });
      }

      const [societyId] = await KNEX(TABLES.Floors)
        .leftJoin(
          TABLES.Blocks,
          `${TABLES.Blocks}.id`,
          `${TABLES.Floors}.blockId`,
        )
        .where({ [`${TABLES.Floors}.id`]: floorId })
        .pluck('societyId');

      await KNEX(TABLES.RentalUnits).insert({ name, floorId, societyId, type });

      return res.json({
        success: true,
        message: 'Rental Unit added successfully',
      });
    } catch (error) {
      console.log(`Error in creating rental unit: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.post(
  '/update',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      sanitizeAndValidateRequest(req.body, validationSchemas.updateRentalUnit, {
        BEFORE_VALIDATION: {
          type: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
          name: [
            REQUEST_VALIDATOR_MODIFICATIONS.TRIM,
            REQUEST_VALIDATOR_MODIFICATIONS.UPPERCASE,
          ],
        },
      });

      const { name, id, type, floorId } = req.body;

      const rentalUnitWithGivenIdPromise = KNEX(TABLES.RentalUnits).where({
        id,
      });

      const cityWithGivenNameAndFloorPromise = KNEX(TABLES.RentalUnits)
        .where({
          name,
          floorId,
        })
        .andWhereNot({ id });

      const [[rentalUnitWithGivenId], [rentalUnitWithGivenNameAndState]] =
        await Promise.all([
          rentalUnitWithGivenIdPromise,
          cityWithGivenNameAndFloorPromise,
        ]);

      if (!rentalUnitWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Rental Unit not found',
        });
      } else if (rentalUnitWithGivenNameAndState) {
        return res.status(400).json({
          success: false,
          message: 'Rental Unit with same name already exists on this Floor',
        });
      }

      await KNEX(TABLES.RentalUnits).update({ name, type }).where({ id });

      return res.json({
        success: true,
        message: 'Rental Unit updated successfully',
      });
    } catch (error) {
      console.log(`Error in updating rental unit: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

router.get(
  '/all-resident',
  // checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      const { rentalUnitId } = req.query;

      const residents = await KNEX(TABLES.UserRoles)
        .select([
          `${TABLES.Users}.id as userId`,
          `${TABLES.Users}.mobileNumber`,
          `${TABLES.Users}.email`,
          `${TABLES.Users}.firstName`,
          `${TABLES.Users}.middleName`,
          `${TABLES.Users}.lastName`,
          `${TABLES.Users}.profileImage`,
        ])
        .where({
          rentalUnitId,
          role: USER_ROLES.RESIDENT,
          status: USER_ROLES_APPROVAL_STATUS.APPROVED,
        })
        .leftJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.UserRoles}.userId`,
        );

      return res.json({ success: true, data: residents });
    } catch (error) {
      console.log(`Error in updating rental unit: ${error.message}`);
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

// Get all rental units of a society
// Only to residents of the society, super admin, society admin and staff members
router.get(
  '/find-by-society',
  // checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.query, validationSchemas.getRentalUnitsBySocietyId);

      const { societyId } = req.query;

      const rentalUnits = await KNEX(TABLES.RentalUnits)
        .select([
          `${TABLES.RentalUnits}.id`,
          `${TABLES.RentalUnits}.name`,
          `${TABLES.RentalUnits}.type`,
          `${TABLES.RentalUnits}.disabled`,
          `${TABLES.Floors}.id as floorId`,
          `${TABLES.Floors}.name as floorName`,
          `${TABLES.Blocks}.id as blockId`,
          `${TABLES.Blocks}.name as blockName`,
        ])
        .innerJoin(
          TABLES.Floors,
          `${TABLES.RentalUnits}.floorId`,
          `${TABLES.Floors}.id`,
        )
        .innerJoin(
          TABLES.Blocks,
          `${TABLES.Blocks}.id`,
          `${TABLES.Floors}.blockId`,
        )
        .where({ [`${TABLES.RentalUnits}.societyId`]: societyId });

      return res.json({
        success: true,
        data: rentalUnits,
      });
    } catch (error) {
      console.log(
        `Error while fetching rental units by society id: ${error.message}`,
      );
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

// Get all rental units of a society by blockId
// Only to residents of the society, super admin, society admin and staff members
router.get('/find-by-block', async (req, res) => {
  try {
    requestValidator(req.query, validationSchemas.getRentalUnitsByBlockId);

    const { blockId } = req.query;

    const rentalUnits = await KNEX(TABLES.RentalUnits)
      .select([
        `${TABLES.RentalUnits}.id`,
        `${TABLES.RentalUnits}.name`,
        `${TABLES.RentalUnits}.type`,
        `${TABLES.RentalUnits}.disabled`,
        `${TABLES.Floors}.id as floorId`,
        `${TABLES.Floors}.name as floorName`,
        `${TABLES.Blocks}.id as blockId`,
        `${TABLES.Blocks}.name as blockName`,
      ])
      .innerJoin(
        TABLES.Floors,
        `${TABLES.RentalUnits}.floorId`,
        `${TABLES.Floors}.id`,
      )
      .innerJoin(
        TABLES.Blocks,
        `${TABLES.Blocks}.id`,
        `${TABLES.Floors}.blockId`,
      )
      .where({ [`${TABLES.Blocks}.id`]: blockId });

    return res.json({
      success: true,
      data: rentalUnits,
    });
  } catch (error) {
    console.log(
      `Error while fetching rental units by society id: ${error.message}`,
    );
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get all rental units of a floor
// Only to residents of the society, super admin, society admin and staff members
router.get(
  '/',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.query, validationSchemas.getRentalUnitsByFloorId);

      const { floorId } = req.query;

      const rentalUnits = await KNEX(TABLES.RentalUnits).where({ floorId });

      return res.json({
        success: true,
        data: rentalUnits,
      });
    } catch (error) {
      console.log(
        `Error while fetching rental units by society id: ${error.message}`,
      );
      return res.status(500).json({ success: false, message: error.message });
    }
  },
);

// Disable rental unit
router.post(
  '/disable',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.enableOrDisableRentalUnit);

      const { id } = req.body;

      const [rentalUnitWithGivenId] = await KNEX(TABLES.RentalUnits).where({
        id,
        disabled: false,
      });

      if (!rentalUnitWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Rental unit not found',
        });
      }

      await KNEX(TABLES.RentalUnits).update({ disabled: true }).where({ id });

      return res.json({
        success: true,
        message: 'Rental unit disabled successfully',
      });
    } catch (error) {
      console.log(`Error while disabling rental unit: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  },
);

// Enable rental unit
router.post(
  '/enable',
  checkRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.SOCIETY_ADMIN]),
  async (req, res) => {
    try {
      requestValidator(req.body, validationSchemas.enableOrDisableRentalUnit);

      const { id } = req.body;

      const [rentalUnitWithGivenId] = await KNEX(TABLES.RentalUnits).where({
        id,
        disabled: true,
      });

      if (!rentalUnitWithGivenId) {
        return res.status(404).json({
          success: false,
          message: 'Rental Unit not found',
        });
      }

      await KNEX(TABLES.RentalUnits).update({ disabled: false }).where({ id });

      return res.json({
        success: true,
        message: 'Rental Unit enabled successfully',
      });
    } catch (error) {
      console.log(`Error while enabling rental unit: ${error.message}`);
      return res.json({ success: false, message: error.message });
    }
  },
);

router.get(
  '/members',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user }, res) => {
    try {
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1);

      if (!userRole?.rentalUnitId)
        throw Error('User not associated with any rental unit');

      const residents = await KNEX(TABLES.UserRoles)
        .select([
          `${TABLES.Users}.firstName`,
          `${TABLES.Users}.lastName`,
          `${TABLES.Users}.email`,
          `${TABLES.Users}.mobileNumber`,
          `${TABLES.Users}.profileImage`,
          `${TABLES.Users}.id as userId`,

          `${TABLES.RentalUnits}.name as rentalUnitName`,
          `${TABLES.RentalUnits}.type as rentalUnitType`,
          `${TABLES.RentalUnits}.name as rentalUnitName`,
          `${TABLES.RentalUnits}.name as rentalUnitName`,

          `${TABLES.UserRoles}.role`,
          `${TABLES.UserRoles}.id as userRoleId`,
          `${TABLES.UserRoles}.status as rentalUnitStatus`,

          `${TABLES.Blocks}.id as blockId`,
          `${TABLES.Blocks}.name as blockName`,
        ])
        .where({
          role: USER_ROLES.RESIDENT,
          [`${TABLES.RentalUnits}.id`]: userRole?.rentalUnitId,
        })
        .innerJoin(
          TABLES.RentalUnits,
          `${TABLES.RentalUnits}.id`,
          `${TABLES.UserRoles}.rentalUnitId`,
        )
        .innerJoin(
          TABLES.Floors,
          `${TABLES.RentalUnits}.floorId`,
          `${TABLES.Floors}.id`,
        )
        .innerJoin(
          TABLES.Blocks,
          `${TABLES.Blocks}.id`,
          `${TABLES.Floors}.blockId`,
        )
        .innerJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.UserRoles}.userId`,
        );

      return res.json({ success: true, data: residents });
    } catch (error) {
      console.log(`Error fetching all residents: ${error}`);
      return res.status(500).json({
        success: false,
        message: error.message,
        info: error?.info,
      });
    }
  },
);

export default router;
