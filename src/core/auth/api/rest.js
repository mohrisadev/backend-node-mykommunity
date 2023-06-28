import bcrypt from 'bcrypt';
import { Router } from 'express';
import { USER_ROLES } from '../../../constants.js';
import { generateJWT } from '../utils/helpers.js';
import { KNEX, TABLES } from '../../../services/knex.js';
import verifyFirebaseToken from '../../../utils/verifyFirebaseToken.js';

const router = Router();

// todo: when a user is verified by society admin for a rental unit, add role RESIDENT to it

router.post('/super-admin/signup', async (req, res) => {
  try {
    if (req?.headers?.['x-secret'] !== 'vjawvfyjuawvj')
      return res.sendStatus(403);

    const { email, password } = req.body;

    if (!email || !password) throw new Error('Invalid email or password');

    const [user] = await KNEX(TABLES.Users).where({ email });

    if (user) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [createdUser] = await KNEX(TABLES.Users)
      .insert({ email, password: hashedPassword })
      .returning(['email', 'id']);

    await KNEX(TABLES.UserRoles).insert({
      userId: createdUser.id,
      role: USER_ROLES.SUPER_ADMIN,
    });

    const token = await generateJWT({
      email: createdUser.email,
      id: createdUser.id,
    });

    return res.json({
      success: true,
      message: 'User created successfully',
      token,
    });
  } catch (error) {
    console.log(`Error in super-admin signup: ${error.message}`);
    return res.json({ success: false, message: error.message });
  }
});

router.post('/email', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) throw new Error('Invalid email or password');

    const [user] = await KNEX(TABLES.Users)
      .where({ email, disabled: false })
      .select(
        'firstName',
        'lastName',
        'email',
        'mobileNumber',
        'id',
        'password',
      );

    if (!user) {
      throw new Error('Invalid email');
    }

    if (user?.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) throw new Error('Invalid password or email');
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      await KNEX(TABLES.Users)
        .update({ password: hashedPassword })
        .where({ id: user.id });
    }

    if (user?.disabled) {
      throw new Error('User disabled');
    }

    const userRolePromise = KNEX(TABLES.UserRoles)
      .where({ userId: user.id })
      .select('role', 'societyId')
      .limit(1);

    const tokenPromise = generateJWT({
      email: user.email,
      id: user.id,
    });

    const [[userRole], token] = await Promise.all([
      userRolePromise,
      tokenPromise,
    ]);

    delete user?.password;

    return res.json({
      success: true,
      message: 'User signed-in',
      token,
      userRole: userRole?.role,
      societyId: userRole?.societyId,
      profile: user,
    });
  } catch (error) {
    console.log(`Error in super-admin signin: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { firebaseToken, mobileNumber } = req.body;

    const firebaseTokenVerification = await verifyFirebaseToken(firebaseToken);

    let phoneNumberFromFirebase = firebaseTokenVerification?.user?.phone_number
      ? firebaseTokenVerification?.user?.phone_number.slice(-12)
      : '0';

    if (
      !firebaseTokenVerification.success ||
      mobileNumber !== phoneNumberFromFirebase
    ) {
      return res
        .status(401)
        .json({ success: false, message: firebaseTokenVerification.message });
    }

    phoneNumberFromFirebase = phoneNumberFromFirebase.slice(-10);

    let [user] = await KNEX(TABLES.Users).where({
      mobileNumber: phoneNumberFromFirebase,
    });

    // Check if user exists
    if (!user) {
      [user] = await KNEX(TABLES.Users)
        .insert({
          mobileNumber: phoneNumberFromFirebase,
        })
        .returning('*');
    }

    if (user?.disabled) {
      throw new Error('User disabled');
    }

    const token = await generateJWT({
      mobileNumber: user.mobileNumber,
      id: user.id,
    });

    return res.json({
      success: true,
      message: 'Token verified',
      data: { token },
    });
  } catch (error) {
    console.log(`Error in verifying firebase token for user: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
