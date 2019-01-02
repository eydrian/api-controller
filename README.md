[![pipeline status](https://git.eydrian.ch/etter/express-api-controller/badges/master/pipeline.svg)](https://git.eydrian.ch/etter/express-api-controller/commits/master)
[![coverage report](https://git.eydrian.ch/etter/express-api-controller/badges/master/coverage.svg)](https://git.eydrian.ch/etter/express-api-controller/commits/master)

# express-api-controller

## This is an inheritable api controller for a nodejs express app

### to install
```
npm install express-inheritable-base-controller --save
```
### usage example

1. include your own isAuthenticated and hasAuthorization hooks

```TypeScript
// controllers/base.controller.server.ts
import {
  Response,
  NextFunction
} from 'express';
import {
  BaseController,
  IApiModel,
  IApiRequest
} from 'es6-api-controller';

import {
  isAuthenticated,
  hasAuthorization
} from './users.auth.controller';


abstract class MyBaseController<T extends IApiModel> extends BaseController<T> {
  isAuthenticated(req: IApiRequest, res: Response, next: NextFunction) {
    return isAuthenticated(req, res, next);
  }
  hasAuthorization(
    roles: string | string[],
    req: IApiRequest,
    res: Response,
    next: NextFunction
  ) {
    return hasAuthorization(roles, req, res, next);
  }

}

export default MyBaseController;

```

2. Inherit MyBaseController in all your express controllers

```TypeScript
import { IApiRequest } from 'es6-api-controller';
import MyBaseController from './base.controller';
import { IUserModel } from '../types/user.model.types';
// controllers/users.controller.server.ts

class UsersController extends MyBaseController<IUserModel> {
  constructor(model: IUserModel) {
    super(model);
    this.filters.push('roles');
  }
}

const usersController = new UsersController(User);

export default usersController;
```

3. setup your routes in the following way

```TypeScript
import {
  Router
} from 'express';
import {
  signin,
  signup,
  signout
} from '../controllers/users.auth.controller';

import usersController from '../controllers/users.controller';

const userRouter = Router();

userRouter.post('/auth/signin', signin);
userRouter.post('/auth/signup', signup);
userRouter.post('/auth/signout', signout);

userRouter.use('/users', users.isAuthenticated.bind(users));
userRouter.route('/users')
.get(
  usersController.hasAuthorization.bind(users, ['admin', 'client']),
  usersController.index.bind(users),
  usersController.populateMeta.bind(users),
  usersController.apiResponse.bind(users)
)
.post(
  usersController.hasAuthorization.bind(users, ['admin']),
  usersController.create.bind(users)
);
userRouter.route('/users/self')
.get(usersController.self.bind(users))
.put(usersController.updateSelf.bind(users));

userRouter.route('/users/:userId')
.get(
  usersController.hasAuthorization.bind(users, ['admin', 'client']),
  usersController.read.bind(users)
)
.put(
  usersController.hasAuthorization.bind(users, ['admin']),
  usersController.update.bind(users)
)
.delete(usersController.hasAuthorization.bind(users, 'admin'), users.delete.bind(users));

userRouter.param('userId', users.findById.bind(users));
export default userRouter;
```

### Query examples

```
?select=data date&sort={"date":1}
```
