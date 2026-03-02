import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
    totalItems: number;
    itemsPerPage?: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    isLoading: boolean;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
    totalItems,
    itemsPerPage = 50,
    currentPage,
    onPageChange,
    isLoading
}) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const from = (currentPage - 1) * itemsPerPage + 1;
    const to = Math.min(currentPage * itemsPerPage, totalItems);

    console.log("Pagination Rendering:", { totalItems, itemsPerPage, currentPage, totalPages });

    if (totalItems === 0) return null;

    return (
        <div className="flex items-center justify-end gap-4 py-3 px-4 text-industrial-300">
            <span className="text-sm font-medium">
                {from} - {to} de {totalItems}
            </span>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="p-1 rounded hover:bg-industrial-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Anterior"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="p-1 rounded hover:bg-industrial-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Siguiente"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
