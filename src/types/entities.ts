export interface BaseMolecule {
  /** Molecule snowflake ID */
  id: string;
  /** Molecule name (free text) */
  name: string;
  /** Molecule short alias */
  alias: string;
  /** Mol smiles formula (optional) */
  smiles: string;
  /** Category, should be a GO Term */
  category: string;
  /** Molecule version (free text) */
  version: string;
  /** Free comment text. */
  comments: string;
  /** Citation */
  citation: string;
  /** Information about a protein validation, model quality */
  validation: string;
  /** String version of the used command line (other parameters) */
  command_line: string;
  /** Way to create the martinized molecule (id that refers in create_way field of settings.json) */
  create_way: string;
  /** Force field version */
  force_field: string;
  /** Stringified ISO date of creation date */
  created_at: string;
  /** Molecule parent version. If string, ref to <Molecule.id> */
  parent: null | string;
  /** Tree snowflake ID. Shared between parent and children */
  tree_id: string;
  /** Hash of generated zip file attached to this module */
  hash: string;
  /** Reference to <User.id> owner/curator of this mol */
  owner: string;
  /** ID of related file containing `.itp` and `.gro`/`.pdb` files */
  files: string;
  /** Author (if fetched). */
  author?: string;
}

export interface Molecule extends BaseMolecule {
  /** <User.id> that have approved this molecule */
  approved_by: string;
  /** Last time as ISO date the user/admin edited this molecule */
  last_update: string;
}

export interface StashedMolecule extends BaseMolecule {}

export interface User {
  /** User snowflake ID */
  id: string;
  /** User unique e-mail address */
  email: string;
  /** Display name */
  name: string;
  /** Stringified ISO Date of the user creation */
  created_at: string;
  /** bcrypt-hashed password of the user */
  password: string;
  /** User role */
  role: UserRole;
  approved: boolean;
}

export interface Token {
  /** JTI UUID snowflake */
  id: string;
  /** <User.id> who own this token */
  user_id: string;
  /** Stringified ISO date of the token creation */
  created_at: string;
}

export type UserRole = "admin" | "curator";
