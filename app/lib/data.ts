import { customers, invoices, revenue } from "../lib/placeholder-data";
import {
  Customer,
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  try {
    // We artificially delay a response for demo purposes.
    // Don't do this in production :)
    const ms = Math.random() * 5000
    console.log('Fetching revenue data...', ms);
    await new Promise((resolve) => setTimeout(resolve, ms));

    console.log('Data fetch completed after ', ms, ' seconds.');

    return revenue;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const ms = Math.random() * 5000
    console.log('fetchLatestInvoices...', ms);
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000));

    console.log('Data fetch completed after ', ms, ' seconds.');

    let top5Item = invoices.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

    // 获取前 5 个，并通过 consumerId 进行 JOIN
    let id = 0
    return top5Item.map(item => {
      const consumer = (customers.find(consumer => consumer.id === item.customer_id)) as Customer;
      return {
        amount: formatCurrency(item.amount),
        name: consumer.name,
        image_url: consumer.image_url,
        email: consumer.email,
        id: id++ + ""
      } as LatestInvoice;
    });

  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {

    const ms = Math.random() * 5000
    console.log('fetchCardData...', ms);
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000));

    console.log('Data fetch completed after ', ms, ' seconds.');

    const result = invoices.reduce((acc: any, item) => {
      // 如果该组别还没有存在，则初始化它
      if (!acc[item.status]) {
        acc[item.status] = 0;
      }
      // 累加该组别的值
      acc[item.status] += item.amount;
      return acc;
    }, {});

    const numberOfInvoices = invoices.length;
    const numberOfCustomers = customers.length;
    const totalPaidInvoices = formatCurrency(result['paid']);
    const totalPendingInvoices = formatCurrency(result['pending']);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {

    const ms = Math.random() * 5000
    console.log('fetchLatestInvoices...', ms);
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5000));

    console.log('Data fetch completed after ', ms, ' seconds.');

    let id = 0
    let invoiceList = invoices.map(item => {
      const consumer = (customers.find(consumer => consumer.id === item.customer_id)) as Customer;
      return {
        ...item,
        ...consumer,
        id: id++ + ""
      } as InvoicesTable;
    })

    return invoiceList
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(item => {
        return item.name.indexOf(query) != -1 
          || item.email.indexOf(query) != -1 
          || (item.amount + "").indexOf(query) != -1 
          || item.date.indexOf(query) != -1 
          || item.status.indexOf(query) != -1 
      })
      .slice(offset, ITEMS_PER_PAGE)
      
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
