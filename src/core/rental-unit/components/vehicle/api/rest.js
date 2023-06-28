import { Router } from 'express';
import { USER_ROLES } from '../../../../../constants.js';
import { checkRole } from '../../../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../../../services/knex.js';
import { requestValidator } from '../../../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';

const router = Router();

router.post(
  '/',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.addVehicle);

      const { name, image, number, type } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.RESIDENT,
        })
        .limit(1)
        .select('rentalUnitId');

      if (!userRole?.rentalUnitId)
        throw new Error('User not linked to rental unit');

      await KNEX(TABLES.Vehicles).insert({
        name,
        image,
        number,
        type,
        userId: user.id,
        rentalUnitId: userRole.rentalUnitId,
      });

      return res.json({
        success: true,
        message: 'Vehicle was added successfully',
      });
    } catch (error) {
      console.log(`Error while adding vehicle: ${error.message}`);
      return res
        .status(500)
        .json({ success: false, message: error.message, info: error?.info });
    }
  },
);

router.get('/', checkRole([USER_ROLES.RESIDENT]), async ({ user }, res) => {
  try {
    const [userRole] = await KNEX(TABLES.UserRoles)
      .where({
        userId: user.id,
        role: USER_ROLES.RESIDENT,
      })
      .limit(1)
      .select('rentalUnitId');

    if (!userRole?.rentalUnitId)
      throw new Error('User not linked to rental unit');

    const vehicles = await KNEX(TABLES.Vehicles).where({
      rentalUnitId: userRole.rentalUnitId,
    });

    return res.json({ success: true, data: vehicles });
  } catch (error) {
    console.log(`Error while fetching vehicle: ${error.message}`);
    return res
      .status(500)
      .json({ success: false, message: error.message, info: error?.info });
  }
});

export default router;
