export const DEPARTMENTS = ['미디어홍보부', '전공체험부', '전략기획부', '임원진/부장', '신입기수'] as const;
export type Department = typeof DEPARTMENTS[number];
