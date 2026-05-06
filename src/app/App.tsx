import { RouterProvider } from 'react-router';
import { CRMProvider } from './context/CRMContext';
import { router } from './routes';

export default function App() {
  return (
    <CRMProvider>
      <RouterProvider router={router} />
    </CRMProvider>
  );
}
