import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Navigate } from 'react-router-dom';

export const SmartRedirect = () => {
    const recentMemos = useLiveQuery(() =>
        db.memos.orderBy('updatedAt').reverse().limit(1).toArray()
    );

    if (recentMemos === undefined) {
        return null; // or a loading spinner
    }

    if (recentMemos.length > 0) {
        return <Navigate to={`/memo/${recentMemos[0].id}`} replace />;
    } else {
        return <Navigate to="/memo/new" replace />;
    }
};
