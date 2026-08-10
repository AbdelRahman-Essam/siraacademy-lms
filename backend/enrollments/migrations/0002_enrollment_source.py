from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('enrollments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollment',
            name='source',
            field=models.CharField(
                choices=[('self', 'Self-enrolled'), ('admin', 'Enrolled by admin'), ('purchase', 'Purchase order (future)')],
                default='self', max_length=10,
            ),
        ),
    ]
