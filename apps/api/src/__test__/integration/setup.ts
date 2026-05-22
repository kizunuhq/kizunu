// Setup for the Vitest `integration` project. Runs before each test file.
// Points environment defaults at the isolated test database.
process.env['NODE_ENV'] ??= 'test'
process.env['TEST_DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/kizunu_test'
