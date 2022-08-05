import { ModelInit, MutableModel, __modelMeta__, OptionallyManagedIdentifier, CompositeIdentifier } from "@aws-amplify/datastore";





export declare class BasicModel {
  readonly [__modelMeta__]: {
    identifier: OptionallyManagedIdentifier<BasicModel, 'id'>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly id: string;
  readonly body: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  constructor(init: ModelInit<BasicModel>);
  static copyOf(source: BasicModel, mutator: (draft: MutableModel<BasicModel>) => MutableModel<BasicModel> | void): BasicModel;
}

export declare class Post {
  readonly [__modelMeta__]: {
    identifier: CompositeIdentifier<Post, ['postId', 'title']>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly postId: string;
  readonly title: string;
  readonly comments?: (Comment | null)[] | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  constructor(init: ModelInit<Post>);
  static copyOf(source: Post, mutator: (draft: MutableModel<Post>) => MutableModel<Post> | void): Post;
}

export declare class Comment {
  readonly [__modelMeta__]: {
    identifier: CompositeIdentifier<Comment, ['commentId', 'content']>;
    readOnlyFields: 'createdAt' | 'updatedAt';
  };
  readonly commentId: string;
  readonly content: string;
  readonly post?: Post | null;
  readonly postId?: string | null;
  readonly postTitle?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  constructor(init: ModelInit<Comment>);
  static copyOf(source: Comment, mutator: (draft: MutableModel<Comment>) => MutableModel<Comment> | void): Comment;
}