const jwt = require("jsonwebtoken");
const {
  createUser,
  ensureUsersFileExists,
  findOrCreateGoogleUser,
  findUserByEmail,
  validatePassword,
} = require("../services/userService");

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      authProvider: user.authProvider,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function buildAuthResponse(user) {
  return {
    token: createToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
    },
  };
}

exports.signup = async (request, response, next) => {
  try {
    await ensureUsersFileExists();
    const { name = "", email = "", password = "" } = request.body;

    if (!email.trim() || !password.trim()) {
      return response
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return response
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const user = await createUser({
      name: name.trim() || "Healthcare User",
      email: email.trim(),
      password: password.trim(),
    });

    return response.status(201).json(buildAuthResponse(user));
  } catch (error) {
    next(error);
  }
};

exports.login = async (request, response, next) => {
  try {
    await ensureUsersFileExists();
    const { email = "", password = "" } = request.body;

    if (!email.trim() || !password.trim()) {
      return response
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return response.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await validatePassword(user, password.trim());
    if (!isPasswordValid) {
      return response.status(401).json({ message: "Invalid email or password." });
    }

    return response.status(200).json(buildAuthResponse(user));
  } catch (error) {
    next(error);
  }
};

exports.googleLogin = async (request, response, next) => {
  try {
    await ensureUsersFileExists();
    const { name = "", email = "", googleId = "" } = request.body;

    if (!email.trim() || !googleId.trim()) {
      return response.status(400).json({
        message: "Google login requires a valid email and Google account id.",
      });
    }

    // For a production system, verify the Google token on the server as well.
    const user = await findOrCreateGoogleUser({
      name: name.trim() || "Google User",
      email: email.trim(),
      googleId: googleId.trim(),
    });

    return response.status(200).json(buildAuthResponse(user));
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (request, response) => {
  response.status(200).json({
    user: {
      id: request.user.userId,
      email: request.user.email,
      name: request.user.name,
      authProvider: request.user.authProvider,
    },
  });
};
