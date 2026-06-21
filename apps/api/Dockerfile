# --- Build stage ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first (leverages layer caching when only source changes).
COPY WebhookCity.Api.csproj ./
RUN dotnet restore WebhookCity.Api.csproj

# Build and publish.
COPY . ./
RUN dotnet publish WebhookCity.Api.csproj -c Release -o /app /p:UseAppHost=false

# --- Runtime stage ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Kestrel listens on 8080 inside the container.
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "WebhookCity.Api.dll"]
