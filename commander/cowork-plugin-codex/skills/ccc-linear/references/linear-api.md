# Linear GraphQL fallback for /ccc-linear

Use these only when no Linear connector is loaded and `LINEAR_API_KEY` is set. Every call goes to `https://api.linear.app/graphql` with the key in the `Authorization` header and nowhere else. Never echo the key.

```bash
linear_gql() {
  curl -s https://api.linear.app/graphql \
    -H "Authorization: $LINEAR_API_KEY" \
    -H 'Content-Type: application/json' \
    -d "$1"
}
```

If the response has an `errors` array, report its first `message` and stop.

## Teams (step 2)

```json
{"query":"query{teams{nodes{id key name}}}"}
```

## My open issues (steps 4a, 4b)

```json
{"query":"query{viewer{assignedIssues(first:10,orderBy:updatedAt,filter:{state:{type:{in:[\"started\",\"unstarted\"]}}}){nodes{id identifier title url state{name type} team{id key}}}}}"}
```

## Started state for a team (step 4b)

```json
{"query":"query($team:String!){workflowStates(filter:{team:{key:{eq:$team}},type:{eq:\"started\"}}){nodes{id name}}}","variables":{"team":"<TEAM_KEY>"}}
```

Use the first returned state id.

## Move an issue (step 4b)

```json
{"query":"mutation($id:String!,$state:String!){issueUpdate(id:$id,input:{stateId:$state}){success issue{identifier state{name type}}}}","variables":{"id":"<ISSUE_ID>","state":"<STATE_ID>"}}
```

Continue only when `success` is true and `state.type` is `started`.

## Team labels (step 4c)

```json
{"query":"query($team:String!){issueLabels(filter:{team:{key:{eq:$team}}}){nodes{id name}}}","variables":{"team":"<TEAM_KEY>"}}
```

## Create an issue (step 4c)

```json
{"query":"mutation($input:IssueCreateInput!){issueCreate(input:$input){success issue{identifier url}}}","variables":{"input":{"teamId":"<TEAM_ID>","title":"<TITLE>","description":"<DESCRIPTION>","labelIds":["<LABEL_ID>"]}}}
```

Omit `labelIds` when no matching label exists.

## Board (step 4d)

```json
{"query":"query($team:String!){issues(first:150,orderBy:updatedAt,filter:{team:{key:{eq:$team}},state:{type:{neq:\"canceled\"}}}){nodes{identifier title state{name type}}}}","variables":{"team":"<TEAM_KEY>"}}
```
