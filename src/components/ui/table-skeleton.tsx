import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 8 }: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableHead key={index}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="animate-pulse">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className={`h-4 ${
                  colIndex === 0 ? 'w-24' : 
                  colIndex === 1 ? 'w-32' : 
                  colIndex === 2 ? 'w-40' : 
                  colIndex === 3 ? 'w-20' : 
                  colIndex === 4 ? 'w-36' :
                  colIndex === 5 ? 'w-24' :
                  'w-16'
                }`} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}