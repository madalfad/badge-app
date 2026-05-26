export type BadgeCardSection = {
  label: string;
  value: string;
};

export type BadgeCard = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  accentColor: string;
  code: string;
  sections: BadgeCardSection[];
  footer: string;
  isFavorite: boolean;
};

export type CardRecord = {
  id: string;
  title: string;
  subtitle: string | null;
  categoryId: string | null;
  primaryColor: string | null;
  sortOrder: number;
  isFavorite: boolean;
  isArchived: boolean;
  reviewDate: string | null;
  sourceType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lastViewedAt: string | null;
};

export type CardAssetRecord = {
  id: string;
  cardId: string;
  side: string;
  fileUri: string;
  thumbnailUri: string;
  displayUri: string | null;
  mimeType: string;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  fileSize: number | null;
  thumbhash: string | null;
  ocrText: string | null;
  cropDataJson: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCardInput = {
  id?: string;
  title: string;
  subtitle?: string | null;
  categoryId?: string | null;
  primaryColor?: string | null;
  sortOrder?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
  reviewDate?: string | null;
  sourceType?: string;
  notes?: string | null;
};

export type UpdateCardInput = Partial<
  Pick<
    CreateCardInput,
    | 'title'
    | 'subtitle'
    | 'categoryId'
    | 'primaryColor'
    | 'sortOrder'
    | 'isFavorite'
    | 'isArchived'
    | 'reviewDate'
    | 'sourceType'
    | 'notes'
  >
>;

export type PrototypeCardNotes = {
  code?: string;
  sections?: BadgeCardSection[];
  footer?: string;
};
