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
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<SlackDelivery> SlackDeliveries => Set<SlackDelivery>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.Slug).IsUnique();
            entity.Property(p => p.Name).IsRequired();
            entity.Property(p => p.Slug).IsRequired();
            // Stored as a readable string. The application always sets this
            // explicitly at creation, so no DB-generated default is configured
            // (which would otherwise mask an explicit "Webhooks" choice, since
            // it is the enum's zero value).
            entity.Property(p => p.Capability)
                .HasConversion<string>()
                .IsRequired();

            // Deleting a group orphans its projects (sets GroupId null), never
            // cascade-deletes the projects.
            entity.HasOne(p => p.Group)
                .WithMany(g => g.Projects)
                .HasForeignKey(p => p.GroupId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(g => g.Id);
            entity.HasIndex(g => g.Slug).IsUnique();
            entity.Property(g => g.Name).IsRequired();
            entity.Property(g => g.Slug).IsRequired();

            entity.HasOne(g => g.Parent)
                .WithMany(g => g.Children)
                .HasForeignKey(g => g.ParentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Endpoint>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => new { e.ProjectId, e.Slug }).IsUnique();

            entity.Property(e => e.Kind)
                .HasConversion<string>()
                .IsRequired();

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

            // Filtering the feed by kind (webhooks vs logs).
            entity.HasIndex(e => new { e.ProjectId, e.Kind, e.ReceivedAt });

            entity.Property(e => e.Kind)
                .HasConversion<string>()
                .IsRequired();

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

        modelBuilder.Entity<SlackDelivery>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.HasIndex(d => d.EventId).IsUnique();
            entity.HasIndex(d => new { d.Status, d.NextAttemptAt });
            entity.Property(d => d.Status).IsRequired();

            entity.HasOne(d => d.Event)
                .WithOne()
                .HasForeignKey<SlackDelivery>(d => d.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
