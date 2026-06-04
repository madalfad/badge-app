import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { CardFilter } from "./useFilteredCards";

type SearchFilterBarProps = {
  query: string;
  filter: CardFilter;
  categories: string[];
  tags: string[];
  resultCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onFilterChange: (filter: CardFilter) => void;
};

function getFilterKey(filter: CardFilter) {
  if (filter.type === "category" || filter.type === "tag") {
    return `${filter.type}:${filter.value}`;
  }

  return filter.type;
}

export function SearchFilterBar({
  query,
  filter,
  categories,
  tags,
  resultCount,
  totalCount,
  onQueryChange,
  onFilterChange,
}: SearchFilterBarProps) {
  const activeFilterKey = getFilterKey(filter);
  const hasQuery = query.trim().length > 0;
  const hasFilter = filter.type !== "all";

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search badge cards"
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search title, category, tags…"
          placeholderTextColor="#64748B"
          returnKeyType="search"
          style={styles.input}
        />
        {hasQuery || hasFilter ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onQueryChange("");
              onFilterChange({ type: "all" });
            }}
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <FilterChip
          label="All"
          selected={activeFilterKey === "all"}
          onPress={() => onFilterChange({ type: "all" })}
        />
        <FilterChip
          label="Favorites"
          selected={activeFilterKey === "favorites"}
          onPress={() => onFilterChange({ type: "favorites" })}
        />
        <FilterChip
          label="Recent"
          selected={activeFilterKey === "recent"}
          onPress={() => onFilterChange({ type: "recent" })}
        />
        <FilterChip
          label="Archived"
          selected={activeFilterKey === "archived"}
          onPress={() => onFilterChange({ type: "archived" })}
        />
        {categories.map((category) => (
          <FilterChip
            key={`category:${category}`}
            label={category}
            selected={activeFilterKey === `category:${category}`}
            onPress={() =>
              onFilterChange({ type: "category", value: category })
            }
          />
        ))}
        {tags.map((tag) => (
          <FilterChip
            key={`tag:${tag}`}
            label={`#${tag}`}
            selected={activeFilterKey === `tag:${tag}`}
            onPress={() => onFilterChange({ type: "tag", value: tag })}
          />
        ))}
      </ScrollView>

      <Text style={styles.resultText}>
        {hasQuery || hasFilter
          ? `${resultCount} of ${totalCount} cards match`
          : "Search and filters are local to this device"}
      </Text>
    </View>
  );
}

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#101C2EE6",
    padding: 11,
    gap: 9,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#07111F",
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 13,
  },
  clearButton: {
    minHeight: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "900",
  },
  filterRow: {
    gap: 8,
    paddingRight: 2,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#26364F",
    backgroundColor: "#17243A",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipSelected: {
    borderColor: "#2DD4BF99",
    backgroundColor: "#2DD4BF22",
  },
  filterChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "900",
  },
  filterChipTextSelected: {
    color: "#F8FAFC",
  },
  resultText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.78,
  },
});
