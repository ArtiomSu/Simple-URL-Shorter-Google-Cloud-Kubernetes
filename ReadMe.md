# Simple URL Shorter - Google Cloud - Kubernetes
A simple url shorter API built with nodejs running on Kubernetes in Google Cloud, using PostgreSQL for storage and cloud sql proxy.

Supports shortening url via post requests and redirects to full url if shortened ID exists in the database.

In dev mode you can also clear the table and get all database rows in a json format. 

## Usage
The Quickest way is to use Curl. 

The `short` (optional) property is what your ideal shortened id would look like. If your desired ID is taken you will get an error message and you will need to create a different one. If you don't supply `short` a random available ID will be generated for you.  

The `full` property is mandatory, and it will be the url that you will be redirected to.

```bash
curl -d '{"short":"gg", "full":"https://google.com"}' -H "Content-Type: application/json" -X POST http://server-ip/
```

After a successful Query you will get a piece of json that looks like this `{"url":"http://server-ip/gg"}` which is your shortened url.

## Setup
1. You will need to have a Google Cloud account setup and active (requires card).
2. Install gcloud sdk.
3. Install Docker and Kubectl.
4. psql

#### - PostgreSQL Database -
1. Create a PostgreSQL Instance in google cloud console and check the public ip.
2. Create a service account and save the json file, this is will be used for `cloud_sql_proxy`.
3. Start up `cloud_sql_proxy` and leave it running
```
./cloud_sql_proxy -instances=<projectname>tcp:5432 -credential_file=./credentials.json
```
4. Login to the DB with psql 
```
psql "host=127.0.0.1 port=5433 sslmode=disable dbname=<dbname> user=<dbuser>"
```
5. Create the following table:
```sql
CREATE TABLE IF NOT EXISTS public.url (
short character varying(20) PRIMARY KEY,
full_ character varying(255) NOT NULL
);
```

#### - Create and upload docker image to google registry -
1. `export PROJECT_ID=<your project name>` set this as an env variable so commands are easier to type.
2. `docker build --network=host -t gcr.io/${PROJECT_ID}/url-shortner:v1 .`
3. You can test the docker image by running `docker run --rm -p 8080:8080 -it --entrypoint /bin/sh  gcr.io/${PROJECT_ID}/url-shortner:v1` it will be on port 8080 in your browser.
4. At this point you will need to setup gcloud by running `gcloud init`.
5. Enable registry api `gcloud services enable containerregistry.googleapis.com`
6. Get docker config `gcloud auth configure-docker`
7. push the docker image `docker push gcr.io/${PROJECT_ID}/url-shortner:v1`

#### - Create Kubernetes Cluster -
1. `gcloud container clusters create url-cluster --zone europe-west2-c` --zone is optional
2. get kubectl config `gcloud container clusters get-credentials url-cluster`
3. Copy `kube-secrets-template.env` to `kube-secrets.env` and update it with your database info.
4. `kubectl create secret generic envs --from-env-file=kube-secrets.env` will allow the api to get access to the passwords in a safer way.
5. To use cloud_sql_proxy in the cluster you will need to add the service account json as a secret. `kubectl create secret generic cloudsql-sa-creds --from-file=credentials.json=credentials.json`
6. Now copy the `deploy-template.yaml` to `deploy.yaml` and replace `<image>`, `<projectname>`
7. `kubectl apply -f deploy.yaml` this will create the api and cloud proxy.
8. You can check their status with `kubectl get pods`
9. To access the api properly I will use a LoadBalancer create it like this
```bash
kubectl expose deployment url-app-deployment --name=url-shortner-service --type=LoadBalancer --port 80 --target-port 8080
```
10. To get the public ip (EXTERNAL-IP) of the balancer use `kubectl get service` this will be from where the app can be accessed. The api uses port 80 by default so you can copy and paste the ip into your browser, and you will get a curl command that you can copy nicely populated with the ip. 


### Dev
To develop the app you will need to fire up `cloud_sql_proxy` again if you want to use the remote database.

Copy the `.env-template` as `.env` and edit appropriately this is essentially a drop in replacement for `kube-secrets.env` but setup for a development environment.

To run the app do `npm install && npm run debug` if you want extra output from the debug module.

#### - Secret Dev Routes -
`GET 127.0.0.1:8080/test/all_links` will display all rows in the database.

`GET 127.0.0.1:8080/test/clear_table` will delete all rows.















