const jwt = require("jsonwebtoken");

module.exports = function authenticateToken(request, response, next) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return response.status(401).json({ message: "Access token is missing." });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    request.user = decodedToken;
    next();
  } catch (_error) {
    return response.status(401).json({ message: "Invalid or expired token." });
  }
};
