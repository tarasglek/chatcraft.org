import { Children, isValidElement, ReactNode } from "react";
import { Card } from "@chakra-ui/react";
import DataTable, { TableColumn } from "react-data-table-component";

type TableElement = React.ReactElement & {
  props: {
    children?: React.ReactNode;
  };
};

interface TableData {
  [key: string]: string;
}

const extractTextContent = (node: ReactNode): string => {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextContent).join("");
  if (isValidElement(node)) {
    return extractTextContent(node.props.children);
  }
  return "";
};

interface MarkdownTableProps {
  children: ReactNode;
}

const MarkdownTable = ({ children }: MarkdownTableProps) => {
  try {
    const [thead, tbody] = Children.toArray(children) as TableElement[];
    if (!thead?.props?.children || !tbody?.props?.children) {
      throw new Error("Invalid table structure");
    }

    const headerRow = Children.toArray(thead.props.children)[0] as TableElement;
    if (!headerRow?.props?.children) {
      throw new Error("No header row found");
    }

    // Extract headers
    const headerCells = Children.toArray(headerRow.props.children) as TableElement[];
    const headers: TableColumn<TableData>[] = headerCells.map((cell) => {
      const headerText = extractTextContent(cell.props.children);
      return {
        name: headerText,
        selector: (row: TableData) => row[headerText] || "",
        sortable: true,
        wrap: true,
      };
    });

    // Extract data rows
    const bodyRows = Children.toArray(tbody.props.children) as TableElement[];
    const data: TableData[] = bodyRows.map((row) => {
      const rowData: TableData = {};
      const cells = Children.toArray(row.props.children) as TableElement[];

      headers.forEach((header, index) => {
        const cell = cells[index];
        const columnName = header.name as string;
        rowData[columnName] = extractTextContent(cell?.props?.children || "");
      });

      return rowData;
    });

    return (
      <Card my={4}>
        <DataTable
          columns={headers}
          data={data}
          dense
          persistTableHead
          pagination
          paginationPerPage={10}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          highlightOnHover
          responsive
          noDataComponent={<div className="p-4">No data available</div>}
        />
      </Card>
    );
  } catch (error) {
    console.error("Error rendering table:", error);
    return <div className="table-error">Error rendering table: {(error as Error).message}</div>;
  }
};

export default MarkdownTable;
