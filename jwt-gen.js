const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    sub: 'fc748ddf-c6e6-4ed4-b67c-189cfa902559',
    email: 'admin@test.com',
    role: 'ADMIN'
  },
  '8246147eebba22f0b0a4942c12b9810b7494908e9bca857d9611d8c3eb968e2b6fc92c71f0f2975ddcc3029221f82a6f',
  { expiresIn: '1h' }
);

console.log(token);
