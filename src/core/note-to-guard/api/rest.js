import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { checkRole } from '../../../middlewares/checkRole.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import { requestValidator } from '../../../utils/validator.js';
import validationSchemas from '../utils/validationSchema.js';
import { sendNotificationToSocietyGuard } from '../../../utils/helpers.js';

const router = Router();

router.post(
  '/',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ body, user }, res) => {
    try {
      requestValidator(body, validationSchemas.createNote);

      const { note, attachment, image } = body;

      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({ userId: user.id, role: USER_ROLES.RESIDENT })
        .limit(1);

      if (!userRole?.rentalUnitId || !userRole?.societyId) {
        throw new Error('User not associated to any rental unit');
      }

      await KNEX(TABLES.NoteToGuard).insert({
        societyId: userRole.societyId,
        rentalUnitId: userRole.rentalUnitId,
        userId: user.id,
        attachment,
        image,
        note,
      });

      await sendNotificationToSocietyGuard({
        societyId: userRole.societyId,
        title: 'New Note',
        message: `New note added by ${user.firstName}`,
      });

      return res.json({ success: true, message: 'Note created' });
    } catch (error) {
      console.log(`Error while creating note to guard - ${error.message}`);

      return res
        .status(500)
        .json({ success: false, message: error.message, info: error?.info });
    }
  },
);

router.get('/', checkRole([USER_ROLES.RESIDENT]), async ({ user }, res) => {
  try {
    const notes = await KNEX(TABLES.NoteToGuard).where({ userId: user.id });

    return res.json({ success: true, data: notes });
  } catch (error) {
    console.log(`Error while fetching note to guard - ${error.message}`);

    return res
      .status(500)
      .json({ success: false, message: error.message, info: error?.info });
  }
});

router.delete(
  '/',
  checkRole([USER_ROLES.RESIDENT]),
  async ({ user, body }, res) => {
    try {
      requestValidator(body, validationSchemas.deleteNote);

      const { noteId } = body;

      const [note] = await KNEX(TABLES.NoteToGuard)
        .where({ id: noteId })
        .select('userId')
        .limit(1);

      if (!note || note?.userId != user.id) throw Error('Invalid note');

      await KNEX(TABLES.NoteToGuard).where({ id: noteId }).delete();

      return res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
      console.log(`Error while deleting note to guard - ${error.message}`);

      return res
        .status(500)
        .json({ success: false, message: error.message, info: error?.info });
    }
  },
);

router.get(
  '/security',
  checkRole([USER_ROLES.SECURITY_GUARD]),
  async ({ user }, res) => {
    try {
      const [userRole] = await KNEX(TABLES.UserRoles)
        .where({
          userId: user.id,
          role: USER_ROLES.SECURITY_GUARD,
        })
        .limit(1);

      if (!userRole?.societyId) throw Error('Guard not linked to society');

      const notes = await KNEX(TABLES.NoteToGuard)
        .select([
          `${TABLES.NoteToGuard}.id`,
          `${TABLES.NoteToGuard}.createdAt`,
          `${TABLES.NoteToGuard}.note`,
          `${TABLES.NoteToGuard}.attachment`,
          `${TABLES.NoteToGuard}.image`,
          `${TABLES.NoteToGuard}.createdAt`,

          `${TABLES.Users}.id as userId`,
          `${TABLES.Users}.firstName as userFirstName`,
          `${TABLES.Users}.lastName as userLastName`,

          `${TABLES.RentalUnits}.id as rentalUnitId`,
          `${TABLES.RentalUnits}.name as rentalUnitName`,
          `${TABLES.RentalUnits}.type as rentalUnitType`,
          `${TABLES.Floors}.id as floorId`,
          `${TABLES.Floors}.name as floorName`,
          `${TABLES.Blocks}.id as blockId`,
          `${TABLES.Blocks}.name as blockName`,
        ])
        .where({
          [`${TABLES.NoteToGuard}.societyId`]: userRole.societyId,
        })
        .innerJoin(
          TABLES.Users,
          `${TABLES.Users}.id`,
          `${TABLES.NoteToGuard}.userId`,
        )
        .innerJoin(
          TABLES.RentalUnits,
          `${TABLES.RentalUnits}.id`,
          `${TABLES.NoteToGuard}.rentalUnitId`,
        )
        .innerJoin(
          TABLES.Floors,
          `${TABLES.Floors}.id`,
          `${TABLES.RentalUnits}.floorId`,
        )
        .innerJoin(
          TABLES.Blocks,
          `${TABLES.Blocks}.id`,
          `${TABLES.Floors}.blockId`,
        );

      return res.json({ success: true, data: notes });
    } catch (error) {
      console.log(`Error while fetching notes for guard - ${error.message}`);

      return res
        .status(500)
        .json({ success: false, message: error.message, info: error?.info });
    }
  },
);

export default router;
