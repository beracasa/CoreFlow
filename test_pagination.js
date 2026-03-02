function getPaginationRange(page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    return { from, to };
}
const data = Array.from({ length: 12 }, (_, i) => i);
const { from, to } = getPaginationRange(1, 10);
const pagedData = data.slice(from, to + 1);
console.log({ from, to, count: pagedData.length, total: data.length });
