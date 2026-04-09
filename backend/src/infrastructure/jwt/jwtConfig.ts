export const jwtConfig = {
  accessSecret:          process.env.JWT_SECRET          as string,
  refreshSecret:         process.env.JWT_REFRESH_SECRET  as string,
  accessTokenExpiresIn:  process.env.JWT_ACCESS_EXPIRES  ?? "15m",
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? "7d",
}