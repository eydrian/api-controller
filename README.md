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

### use aggregation pipeline

The `index` method of `BaseController` now supports MongoDB aggregation pipeline. To make
use of it define an `aggregationPipeline(query)` function in the corresponding model and return
the desired aggregation pipeline.

Example excerpt from Payment model:

```javascript
const lookups = [{
  from: 'subjects',
  localField: 'subject',
  foreignField: '_id',
  as: 'subject'
}, {
  from: 'accesscodes',
  localField: 'accessCode',
  foreignField: '_id',
  as: 'accessCode'
}, {
  from: 'treatments',
  localField: 'treatment',
  foreignField: '_id',
  as: 'treatment'
}];

PaymentSchema.statics.aggregationPipeline = query => {
  const pipeline = [];

  if (!query.deleted) pipeline.push({ $match: { $and: [{ 'mark.deleted': { $ne: true }}]}});
  if (query.subject) pipeline.push({ $match: { subject: query.subject }});
  if (query.accessCode) pipeline.push({ $match: { accessCode: query.subject }});
  if (query.subjects) pipeline.push({ $match: { subject: { $in: query.subjects }}});
  if (query.project) pipeline.push({ $match: { subject: { $in: query.projectsubjects }}});

  pipeline.push({ $sort: query.sort || { 'timestamps.updated.at': 1 } });
  if (typeof query.offset !== 'undefined') pipeline.push({ $skip: query.offset });
  if (query.limit > 0) {
    pipeline.push({ $limit: typeof query.limit === 'undefined' ? 100 : query.limit });
  }

  if (Array.isArray(lookups)) {
    lookups.forEach(lookup => {
      pipeline.push({ $lookup: lookup });
      pipeline.push({ $unwind: `$${ lookup.as }` });
    });
  }

  if (typeof query.select !== 'undefined') {
    const project = {};
    if (Array.isArray(query.select)) {
      query.select.forEach(entry => {
        project[entry] = 1;
      });
    } else project[query.select] = 1;

    pipeline.push({ $project: project });
  }

  return pipeline;
};

```
