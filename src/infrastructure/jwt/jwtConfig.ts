export const jwtConfig = {
  secret: process.env.JWT_SECRET as string,
  accessTokenExpiresIn: "1h",
  refreshTokenExpiresIn: "7d"
}