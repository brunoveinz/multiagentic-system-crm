from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pipeline", "0002_stage_color"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="address",
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name="lead",
            name="latitude",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="longitude",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="lead",
            name="source",
            field=models.CharField(
                choices=[
                    ("manual", "Carga manual"),
                    ("maps", "Prospección en mapa"),
                ],
                default="manual",
                max_length=20,
            ),
        ),
    ]
