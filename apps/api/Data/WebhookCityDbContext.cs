using Microsoft.EntityFrameworkCore;
using WebhookCity.Api.Models;
using Endpoint = WebhookCity.Api.Models.Endpoint;

namespace WebhookCity.Api.Data;

public class WebhookCityDbContext : DbContext
{
    public WebhookCityDbContext(DbContextOptions<WebhookCityDbContext> options)
        : base(options)
    {
    }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Endpoint> Endpoints => Set<Endpoint>();
    public DbSet<Event> Events => Set<Event>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.Slug).IsUnique();
            entity.Property(p => p.Name).IsRequired();
            entity.Property(p => p.Slug).IsRequired();
            entity.Property(p => p.Capability)
                .HasConversion<string>()
                .HasDefaultValue(ProjectCapability.Both)
                .IsRequired();
        });

        modelBuilder.Entity<Endpoint>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => new { e.ProjectId, e.Slug }).IsUnique();

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Endpoints)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Event>(entity =>
        {
            entity.HasKey(e => e.Id);

            // Hot path: list a project's events newest-first.
            entity.HasIndex(e => new { e.ProjectId, e.ReceivedAt });

            // Drives the retention cleanup job.
            entity.HasIndex(e => e.RetentionExpiresAt);

            entity.Property(e => e.Headers).HasColumnType("jsonb");
            entity.Property(e => e.Body).HasColumnType("jsonb");

            entity.HasOne(e => e.Endpoint)
                .WithMany(ep => ep.Events)
                .HasForeignKey(e => e.EndpointId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Project)
                .WithMany(p => p.Events)
                .HasForeignKey(e => e.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
