import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import pgsql from "../db/postgres/postgres.js";
 
const router = express.Router();

const auth = (req, res, next) => {
    if (!req.session.user) res.status(401).json({ loggedIn: false });
    else next();
}

router.get('/my-groups', auth, asyncHandler(async (req, res) => {

    const groups = await pgsql`
        SELECT 
        groups.id AS id, 
        groups.name AS name,
        groups.description AS description, 
        groups.interval_days AS interval_days,
        groups.created_at AS created_at
        FROM memberships
        JOIN groups
        ON groups.id = memberships.group_id
        WHERE memberships.user_id = ${req.session.user.id}
    `;

    res.json({groups});
}));

router.post('/create-group', auth, asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const { name, description, interval_days, created_at } = req.body.group;

    if (!(name))
        return res.status(400).send();

    const values = [name, description, interval_days, created_at];

    const result = await pgsql`
        INSERT INTO groups (name, description, interval_days, created_at)
        VALUES ${pgsql(values)}
        RETURNING id
    `;

    const groupId = result[0].id;

    await pgsql`
        INSERT INTO memberships (user_id, group_id, joined_at)
        VALUES ${pgsql([userId, , created_at])}
    `;

    res.json({id});
}));

const getOccurrencesSince = asyncHandler(async (userId, lastSync) => {
    const result = await pgsql`
        SELECT group_id, occurred_at, reason, occurred
        FROM occurrences
        WHERE user_id = ${userId}
        AND occurred_at >= ${lastSync}::TIMESTAMP`
    
    return result;
})

router.post('/sync-occurrences', auth, asyncHandler(async (req, res) => {
    const userId = req.session.user.id;
    const { occurrences, lastSync } = req.body;

    const newOccurrencesPromise = getOccurrencesSince(userId, lastSync);

    const validGroups = {};
    const invalids = [];
    const promises = occurrences.map(async (
        {group_id, occurred_at, reason, occurred}, i
    ) => {
        if (!(group_id && occurred_at && reason && occurred)) {
            invalids.push(i);
            return null;
        }

        if (!validGroups[group_id]) {
            const result = await pgsql`
                SELECT 1 FROM memberships 
                WHERE user_id = ${userId}
                AND group_id = ${group_id}
            `;

            if (result.length > 0)
                validGroups[group_id] = true;
            else {
                invalids.push(i);
                return null;
            }
        }

        return [userId, group_id, occurred_at, reason, occurred]
    });

    const values = await Promise.all(promises);
    const validValues = values.filter(v => v !== null);

    await pgsql`
        INSERT INTO occurrences (userId, group_id, occurred_at, reason, occurred)
        VALUES ${pgsql(validValues)}
    `;

    const newOccurrences = await newOccurrencesPromise;

    res.json({ invalids, newOccurrences });
}));

export default router;