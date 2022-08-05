// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { BasicModel, Post, Comment } = initSchema(schema);

export {
  BasicModel,
  Post,
  Comment
};