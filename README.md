# api-controller

## this is an api controller for an express api

this is work in progress

### to install
```
npm install es6-api-controller --save
```
### usage example

1. include your own isAuthenticated and hasAuthorization hooks

```js
// controllers/base.controller.server.js
'use strict';

const BaseController = require('es6-api-controller').BaseController; // eslint-disable-line

const user = require('./users.auth.controller.server');

class MyBaseController extends BaseController {
  isAuthenticated(req, res, next) {
    return user.isAuthenticated(req, res, next);
  }
  hasAuthorization(roles, req, res, next) {
    return user.hasAuthorization(roles, req, res, next);
  }

}

module.exports = MyBaseController;

```

2. Inherit MyBaseController in all your express controllers

```js
// controllers/users.controller.server.js
'use strict';

const BaseController = require('./base.controller.server');

class UsersController extends BaseController {

}

const usersController = new UsersController(require('mongoose').model('User'));

module.exports = usersController;
```

3. setup your routes in the following way

```js
'use strict';

const router = require('express').Router();
const users = require('../controllers/users.controller.server');

const usersAuth = require('../controllers/users.auth.controller.server');

router.post('/auth/signin', usersAuth.signin);
router.post('/auth/signout', usersAuth.signout);

router.use('/users', users.isAuthenticated.bind(users));
router.route('/users')
.get(
  users.hasAuthorization.bind(users, ['admin', 'client']),
  users.index.bind(users),
  users.populateMeta.bind(users),
  users.apiResponse.bind(users)
)
.post(
  users.hasAuthorization.bind(users, ['admin']),
  users.create.bind(users)
);
router.route('/users/self')
.get(users.self.bind(users))
.put(users.updateSelf.bind(users));

router.route('/users/:userId')
.get(
  users.hasAuthorization.bind(users, ['admin', 'client']),
  users.read.bind(users)
)
.put(
  users.hasAuthorization.bind(users, ['admin']),
  users.update.bind(users)
)
.delete(users.hasAuthorization.bind(users, 'admin'), users.delete.bind(users));

router.param('userId', users.findById.bind(users));
module.exports = router;
```

### Post man queries:

```
?select=data date&sort={"date":1}
```
