export type ReelRecord = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  activeCardCount: number;
  totalCardCount: number;
};

export type CreateReelInput = {
  name: string;
  color?: string | null;
  icon?: string | null;
};

export type UpdateReelInput = Partial<
  Pick<CreateReelInput, "name" | "color" | "icon"> & {
    sortOrder: number;
    isArchived: boolean;
  }
>;
