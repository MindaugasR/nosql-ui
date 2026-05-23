export type Document = Record<string, unknown>;

export type DocumentResponse = {
  documents?: Document[];
  limit?: number;
  skip?: number;
  total?: number;
  fieldTypes?: Record<string, string>;
};

export type StackEntry = {
  doc: Document;
  collection: string;
  id: number;
};
